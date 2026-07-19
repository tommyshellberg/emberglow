import { isAlreadyAtTarget } from '@/lib/navigation/is-already-at-target';

describe('isAlreadyAtTarget', () => {
  describe('the remount loop regression', () => {
    // Captured from a real Android SDK 53 session: the gate resolved target
    // 'app' while segments already read ['(app)'], redirected to /(app) anyway,
    // and expo-router REPLACEd the root layout's internal `__root` screen —
    // remounting RootLayout and re-arming the redirect ~2x/second.
    it('reports we are already at the app when segments are already (app)', () => {
      expect(isAlreadyAtTarget({ type: 'app' }, ['(app)'], '/')).toBe(true);
    });

    it('stays put before the navigator has settled', () => {
      // First mount: the Stack has not populated its child state yet, so
      // segments are empty. Redirecting on no location is what re-arms the
      // loop — the replace remounts the tree, which empties segments, which
      // replaces again. Waiting costs a tick: segments are a dependency of the
      // gate's effect, so it re-decides as soon as they arrive.
      expect(isAlreadyAtTarget({ type: 'app' }, [], '/')).toBe(true);
    });
  });

  describe('screens the user navigated to themselves', () => {
    // Captured from a real Android SDK 53 session: tapping "Cooperative Quests"
    // pushes /cooperative-quest-menu — a ROOT-level route, not one inside the
    // (app) group. The resolver keeps returning its Priority 5 fall-through
    // 'app' because nothing special is happening, and the gate replace()d the
    // user straight back to the Play screen before the menu could be read.
    //
    // Target 'app' means "the resolver has nothing to say", which is a reason
    // to LEAVE a screen the resolver owns and NO reason to move anywhere else.
    it.each([
      ['cooperative-quest-menu', '/cooperative-quest-menu'],
      ['create-cooperative-quest', '/create-cooperative-quest'],
      ['join-cooperative-quest', '/join-cooperative-quest'],
      ['cooperative-quest-ready', '/cooperative-quest-ready'],
    ])('leaves the user on /%s', (segment, path) => {
      expect(isAlreadyAtTarget({ type: 'app' }, [segment], path)).toBe(true);
    });

    it('leaves the user in a cooperative quest lobby', () => {
      expect(
        isAlreadyAtTarget(
          { type: 'app' },
          ['cooperative-quest-lobby', '[lobbyId]'],
          '/cooperative-quest-lobby/lobby123'
        )
      ).toBe(true);
    });

    it('leaves the user on the scheduled quest list', () => {
      expect(
        isAlreadyAtTarget(
          { type: 'app' },
          ['scheduled-quest'],
          '/scheduled-quest'
        )
      ).toBe(true);
    });

    it('leaves the user on a tab inside the app group', () => {
      expect(isAlreadyAtTarget({ type: 'app' }, ['(app)'], '/profile')).toBe(
        true
      );
    });
  });

  describe('screens the resolver owns are still evacuated on target app', () => {
    // Load-bearing: nothing else moves the user off these. login-form hands off
    // to /onboarding/welcome, and the end of onboarding has no self-navigation
    // at all — the gate is what puts a freshly-onboarded user into the app.
    it.each([
      'login',
      'onboarding',
      'pending-quest',
      'cooperative-pending-quest',
      'active-quest',
      'quest-completed-signup',
      'streak-celebration',
      'first-quest-result',
    ])('evacuates /%s', (segment) => {
      expect(isAlreadyAtTarget({ type: 'app' }, [segment], `/${segment}`)).toBe(
        false
      );
    });
  });

  describe('other targets', () => {
    it('reports we are already at login when sitting on /login', () => {
      expect(isAlreadyAtTarget({ type: 'login' }, ['login'], '/login')).toBe(
        true
      );
    });

    it('reports we are NOT at login when sitting in the app', () => {
      expect(isAlreadyAtTarget({ type: 'login' }, ['(app)'], '/')).toBe(false);
    });

    it('reports we are already at onboarding when sitting on /onboarding', () => {
      expect(
        isAlreadyAtTarget({ type: 'onboarding' }, ['onboarding'], '/onboarding')
      ).toBe(true);
    });

    it('reports we are already at the active presence run when sitting on /active-quest', () => {
      // Load-bearing loop guard: the resolver keeps emitting 'active-quest'
      // for the entire run, so without this match the gate would re-replace
      // the screen (and remount the root) on every effect run.
      expect(
        isAlreadyAtTarget(
          { type: 'active-quest', questId: 'quest-1' },
          ['active-quest'],
          '/active-quest'
        )
      ).toBe(true);
    });

    it('never reports a match for loading, so the gate stays put', () => {
      expect(isAlreadyAtTarget({ type: 'loading' }, ['(app)'], '/')).toBe(
        false
      );
    });
  });

  describe('the failed-quest redirect loop regression', () => {
    // Captured from a real Android SDK 53 session (2026-07-16): with
    // failedQuest armed, usePathname() read bare '/quest' while segments read
    // ['(app)', 'quest', '[id]'] — the [id] param had not yet materialized
    // into the resolved pathname during a root remount transient. The
    // exact-match check saw '/quest' !== '/quest/quest-7' and re-fired the
    // replace, which could only land above the unsettled child state
    // (expo-router's getNavigateAction diverges on !childState), remounting
    // the root and re-creating the same transient every ~320ms, forever.
    it('stays put while the quest id has not materialized into the pathname', () => {
      expect(
        isAlreadyAtTarget(
          { type: 'quest-result', questId: 'quest-7', outcome: 'failed' },
          ['(app)', 'quest', '[id]'],
          '/quest'
        )
      ).toBe(true);
    });
  });

  describe('quest-result targets carry an id that must match', () => {
    it('reports a match only for the quest we are actually showing', () => {
      expect(
        isAlreadyAtTarget(
          { type: 'quest-result', questId: 'abc123', outcome: 'completed' },
          ['(app)', 'quest', '[id]'],
          '/quest/abc123'
        )
      ).toBe(true);
    });

    it('reports no match when a different quest is showing', () => {
      expect(
        isAlreadyAtTarget(
          { type: 'quest-result', questId: 'abc123', outcome: 'completed' },
          ['(app)', 'quest', '[id]'],
          '/quest/different'
        )
      ).toBe(false);
    });
  });
});
