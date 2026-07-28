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

  describe('the dead streak indicator regression', () => {
    // Reported from a device on 2026-07-28: tapping the flame in the play
    // screen header flashed the streak screen and bounced straight back to
    // Play. The logs showed the whole chain — "Default to app", immediately
    // followed by "navigating to app from /streak-celebration".
    //
    // The resolver only names 'streak-celebration' while
    // shouldShowStreakCelebration is true, so a user who taps in when it is
    // false gets the Priority 5 fall-through 'app', and a strict
    // resolver-owns-this match read their deliberate arrival as a stale one.
    it('leaves the user on the streak screen they tapped into', () => {
      expect(
        isAlreadyAtTarget(
          { type: 'app' },
          ['streak-celebration'],
          '/streak-celebration'
        )
      ).toBe(true);
    });

    // The carve-out is scoped to target 'app' — the resolver's "nothing is
    // happening" answer — and nothing else. This is the guard against
    // over-applying the fix: a version that always reported a match would pass
    // the test above too, and would strand a user on their streak screen while
    // a quest was counting down behind it.
    // 'quest-result' is the load-bearing one: the resolver deliberately ranks
    // streak celebration ABOVE quest results (navigation-state-resolver.ts:208
    // — "highest priority to show before quest complete"), so the auto-shown
    // celebration hands off to the quest result the moment the flag clears.
    // That handoff is the gate's, and it runs through this function.
    it.each([
      'pending-quest',
      'cooperative-pending-quest',
      'quest-result',
      'first-quest-result',
      'login',
      'onboarding',
      'no-hero',
    ])('target %s still evicts a user reading their streak', (type) => {
      expect(
        isAlreadyAtTarget(
          { type, questId: 'q1', outcome: 'completed' } as any,
          ['streak-celebration'],
          '/streak-celebration'
        )
      ).toBe(false);
    });
  });

  describe('screens the resolver owns are still evacuated on target app', () => {
    // Load-bearing: nothing else moves the user off these. login-form hands off
    // to /onboarding/welcome, and the end of onboarding has no self-navigation
    // at all — the gate is what puts a freshly-onboarded user into the app.
    //
    // 'streak-celebration' was in this list and is deliberately not any more.
    // It was the one entry the rationale above never applied to: that screen
    // has three user-facing entry points, so membership could not be read as
    // "the resolver put you here". Its exit is now the screen's own
    // responsibility rather than the gate's — see the dead streak indicator
    // regression above, and streak-celebration.test.tsx.
    it.each([
      'login',
      'onboarding',
      'pending-quest',
      'cooperative-pending-quest',
      'quest-completed-signup',
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

    it('never reports a match for loading, so the gate stays put', () => {
      expect(isAlreadyAtTarget({ type: 'loading' }, ['(app)'], '/')).toBe(
        false
      );
    });
  });

  describe('the dead pre-account links regression', () => {
    // emberglow#359, reported from a device: "Have an account? Log in" on the
    // welcome screen appeared to do nothing. It navigated fine — then the gate
    // put the user straight back, because the resolver still answered
    // 'onboarding' (no store changes when you tap a link) and a strict match
    // read /login as the wrong place. Three links died the same way.
    //
    // Each case below is one of those links, written as
    // (where the resolver says to be, where the user put themselves).
    it.each([
      // welcome.tsx: "Have an account? Log in".
      ['onboarding', ['login'], '/login'],
      // login-form.tsx: "New here? Create a hero".
      ['login', ['onboarding', 'welcome'], '/onboarding/welcome'],
      // quest-completed-signup.tsx: "Create account" (intent=convert).
      ['quest-completed-signup', ['login'], '/login'],
      // The reverse of the above — back to the signup prompt from /login.
      ['login', ['quest-completed-signup'], '/quest-completed-signup'],
    ])('target %s accepts /%s as good enough', (type, segments, pathname) => {
      expect(
        isAlreadyAtTarget({ type } as any, segments as string[], pathname)
      ).toBe(true);
    });

    // The permissiveness is scoped to the resolver's last-resort answers. A
    // quest in flight outranks all of them and must still evict.
    it.each([
      'pending-quest',
      'cooperative-pending-quest',
      'streak-celebration',
      'first-quest-result',
    ])('target %s still evicts a user sitting on /login', (type) => {
      expect(
        isAlreadyAtTarget(
          { type, questId: 'q1', outcome: 'completed' } as any,
          ['login'],
          '/login'
        )
      ).toBe(false);
    });

    // Nothing outside the zone gets in on the zone's ticket.
    it('does not accept an app-group route for target onboarding', () => {
      expect(
        isAlreadyAtTarget({ type: 'onboarding' }, ['(app)'], '/profile')
      ).toBe(false);
    });

    // Cold start: no location yet is a reason to redirect here, unlike the
    // 'app' case above where it is a reason to wait.
    it('still performs the launch redirect when segments are empty', () => {
      expect(isAlreadyAtTarget({ type: 'onboarding' }, [], '/')).toBe(false);
    });
  });

  describe('the /no-hero eviction loop regression', () => {
    // Tapping "Choose your hero" on /no-hero calls resetOnboarding() and
    // router.replace('/onboarding/welcome'), but neither action changes any
    // resolver input (serverUser is untouched), so the resolver still answers
    // 'no-hero' on the very next render. A strict segments[0] === 'no-hero'
    // match read the user's new location (onboarding) as "not there yet" and
    // replaced them straight back onto /no-hero — the button never worked.
    it('accepts the onboarding funnel as good enough for target no-hero', () => {
      expect(
        isAlreadyAtTarget(
          { type: 'no-hero' },
          ['onboarding', 'welcome'],
          '/onboarding/welcome'
        )
      ).toBe(true);
    });

    // The permissiveness must not swallow the case the screen exists for: a
    // hero-less account sitting inside the app group still has to be evicted.
    // This is the guard against over-applying the fix above (an
    // always-true no-hero case would pass the test above too).
    it('still evicts a hero-less account sitting in the app group', () => {
      expect(isAlreadyAtTarget({ type: 'no-hero' }, ['(app)'], '/')).toBe(
        false
      );
    });

    it('reports we are already at no-hero when sitting on /no-hero', () => {
      expect(
        isAlreadyAtTarget({ type: 'no-hero' }, ['no-hero'], '/no-hero')
      ).toBe(true);
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
