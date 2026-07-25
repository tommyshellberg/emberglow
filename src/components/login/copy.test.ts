import { LOGIN_COPY, parseLoginIntent } from './copy';

describe('LOGIN_COPY', () => {
  describe('chooser copy', () => {
    it('frames the signin intent as a return, naming what is waiting', () => {
      expect(LOGIN_COPY.signin.chooserTitle).toBe('Welcome back');
      expect(LOGIN_COPY.signin.chooserSubtitle()).toBe(
        'Your hero, quest history, and guild are waiting.'
      );
    });

    it('frames the convert intent as saving progress, naming the hero', () => {
      expect(LOGIN_COPY.convert.chooserTitle).toBe('Save your progress');
      expect(LOGIN_COPY.convert.chooserSubtitle('Rowan')).toBe(
        "Keep Rowan and everything you've earned."
      );
    });

    // The character store's own default is `character: null`, so
    // `character?.name` is genuinely absent on this path — not a
    // theoretical case.
    it('falls back to a generic hero when the character store is empty', () => {
      expect(LOGIN_COPY.convert.chooserSubtitle(null)).toBe(
        "Keep your hero and everything you've earned."
      );
      expect(LOGIN_COPY.convert.chooserSubtitle(undefined)).toBe(
        "Keep your hero and everything you've earned."
      );
    });

    // `''` is representable — `Character.name` is typed `string` with no
    // non-empty constraint — and it survives `??` while failing `||`, the
    // distinction that has already produced one bug on this branch. This
    // pins the behaviour, not a claim about which callers can produce it.
    it('falls back for an empty-string hero name, not just a missing one', () => {
      expect(LOGIN_COPY.convert.chooserSubtitle('')).toBe(
        "Keep your hero and everything you've earned."
      );
    });
  });

  describe('email step copy', () => {
    it('titles the email step by intent', () => {
      expect(LOGIN_COPY.signin.emailTitle).toBe('Sign in with email');
      expect(LOGIN_COPY.convert.emailTitle).toBe('Sign up with email');
    });

    it('shares one email subtitle across both intents', () => {
      const expected =
        "We'll send a sign-in link to your email. No password needed.";

      expect(LOGIN_COPY.signin.emailSubtitle).toBe(expected);
      // Same string, not a second copy of it — the spec has these
      // identical, so drift between them should be impossible.
      expect(LOGIN_COPY.convert.emailSubtitle).toBe(
        LOGIN_COPY.signin.emailSubtitle
      );
    });
  });

  describe('start-over link', () => {
    // Whether the link belongs on a framing is a property OF the framing, and
    // it lives here rather than as an `intent === 'signin'` test at the render
    // site for a reason the type system enforces: a third intent added to
    // `LoginIntent` cannot compile without answering this question, whereas an
    // inline comparison would silently hide the link for it.
    it('offers the escape hatch back to onboarding on the returning-user framing', () => {
      expect(LOGIN_COPY.signin.showStartNewLink).toBe(true);
    });

    // The link signs the user out, deletes their provisional keys and resets
    // onboarding. Under `convert` — the framing headlined "Save your progress" —
    // it destroys exactly the progress that headline promises to save.
    it('withholds it from the conversion framing, whose progress it would destroy', () => {
      expect(LOGIN_COPY.convert.showStartNewLink).toBe(false);
    });

    // "Create account" promised something onboarding does not do: the account is
    // not created until after quest one. What the link actually opens is
    // character selection.
    it('names character creation rather than an account', () => {
      expect(LOGIN_COPY.signin.startNewLead).toBe('New here?');
      expect(LOGIN_COPY.signin.startNewAction).toBe('Create a hero');
    });

    it('uses one wording across both intents rather than two hand-typed copies', () => {
      // Anchored to a literal first: a `toBe` between two ABSENT fields passes
      // vacuously (undefined === undefined), which is exactly how a sameness
      // test goes green while asserting nothing — it did here on first run.
      expect(LOGIN_COPY.signin.startNewAction).toBe('Create a hero');
      // Same strings, not second copies of them — the spec gives one wording
      // regardless of framing, so drift between them should be impossible.
      expect(LOGIN_COPY.convert.startNewLead).toBe(
        LOGIN_COPY.signin.startNewLead
      );
      expect(LOGIN_COPY.convert.startNewAction).toBe(
        LOGIN_COPY.signin.startNewAction
      );
    });
  });
});

describe('parseLoginIntent', () => {
  it('accepts the intents the copy table knows', () => {
    expect(parseLoginIntent('signin')).toBe('signin');
    expect(parseLoginIntent('convert')).toBe('convert');
  });

  it('falls back to signin for an unrecognised value', () => {
    expect(parseLoginIntent('nonsense')).toBe('signin');
  });

  it('falls back to signin when the param is absent', () => {
    expect(parseLoginIntent(undefined)).toBe('signin');
  });

  // `useLocalSearchParams` hands back an array for a repeated param
  // (`?intent=a&intent=b`). Repeated intent is ambiguous input, so it takes
  // the conservative framing rather than picking an element.
  it('falls back to signin for a repeated (array) param', () => {
    expect(parseLoginIntent(['convert', 'signin'])).toBe('signin');
    expect(parseLoginIntent(['convert'])).toBe('signin');
  });

  it('does not treat inherited object properties as intents', () => {
    // A `value in LOGIN_COPY` check would narrow these to LoginIntent and
    // then index the table with a function or a prototype value.
    expect(parseLoginIntent('toString')).toBe('signin');
    expect(parseLoginIntent('constructor')).toBe('signin');
  });
});
