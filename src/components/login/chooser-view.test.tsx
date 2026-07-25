import type { ReactTestRendererJSON } from 'react-test-renderer';

import * as Linking from 'expo-linking';
import * as React from 'react';
import { StyleSheet } from 'react-native';

import { fireEvent, render, screen } from '@/lib/test-utils';
import { colors } from '@/theme';

import { ChooserView } from './chooser-view';
import { TERMS_URL } from './constants';

jest.mock('expo-linking', () => ({ openURL: jest.fn() }));

// `SocialSignInButtons` is rendered for real — a mocked stand-in would make the
// "nothing here is primary" assertion below say nothing about the Google
// button's variant. Stubbing the API module only removes the network layer the
// credential exchange would reach; nothing in this suite presses a provider.
jest.mock('@/api/auth', () => ({ socialSignIn: jest.fn() }));

// The real `SocialSignInButtons` mounts `ExistingAccountSheet` unconditionally
// (closed, driven by `visible`), and that sheet's confirm action IS a
// `variant="primary"` Cinnabar button. Both available sheet mocks render a
// closed modal's children anyway, which would put that button in this tree and
// break an honest whole-tree colour assertion over what the user can see. The
// real library gates its whole render on `mount`, which starts false
// (`BottomSheetModal.tsx`: `INITIAL_STATE = { mount: false }`, then
// `return mount ? <Portal…> : null`), so a closed modal rendering nothing is
// the faithful model. The rest of the module is kept intact because the
// `@/components/emberglow` barrel reaches several of its exports at load time.
jest.mock('@gorhom/bottom-sheet', () => ({
  ...require('@/lib/test-mocks/gorhom-bottom-sheet').createBottomSheetMock(),
  BottomSheetModal: () => null,
}));

// RNTL 13 skips accessibility-hidden elements by default, so a bare `queryBy*`
// returning null is not proof of absence — it proves absence only from the
// visible part of the tree.
const hidden = { includeHiddenElements: true } as const;

// Deliberately not 'your hero': that is `copy.ts`'s missing-name fallback, so a
// fixture equal to it could not tell "read the prop" from "defaulted".
const HERO_NAME = 'Thornwake';

const ERROR_MESSAGE = 'Login link failed to send. Please try again.';

const renderChooser = (
  props: Partial<React.ComponentProps<typeof ChooserView>> = {}
) => {
  const onContinueWithEmail = jest.fn();
  const onSocialSuccess = jest.fn();
  const onSocialError = jest.fn();
  const view = render(
    <ChooserView
      intent="signin"
      error=""
      onContinueWithEmail={onContinueWithEmail}
      onSocialSuccess={onSocialSuccess}
      onSocialError={onSocialError}
      {...props}
    />
  );
  return { ...view, onContinueWithEmail, onSocialSuccess, onSocialError };
};

type RenderedNode = { testID?: string; backgroundColor?: string };

/**
 * Depth-first walk of the rendered host tree, collecting each node's testID and
 * the `backgroundColor` it actually paints.
 *
 * Both facts are read off the rendered output rather than off props this
 * component passes down: layout ORDER and the one-primary-per-screen rule are
 * properties of the whole composition, and `Button` — the thing that turns a
 * `variant` into a colour — is the real component here.
 */
function collectRenderedNodes(
  node: ReactTestRendererJSON | ReactTestRendererJSON[] | string | null
): RenderedNode[] {
  if (node === null || typeof node === 'string') return [];
  if (Array.isArray(node)) return node.flatMap(collectRenderedNodes);

  const style = StyleSheet.flatten(node.props?.style);
  const collected: RenderedNode[] = [
    {
      testID:
        typeof node.props?.testID === 'string' ? node.props.testID : undefined,
      backgroundColor:
        typeof style?.backgroundColor === 'string'
          ? style.backgroundColor
          : undefined,
    },
  ];

  if (node.children) collected.push(...collectRenderedNodes(node.children));
  return collected;
}

const backgroundColorsOf = (view: {
  toJSON: () => ReactTestRendererJSON | ReactTestRendererJSON[] | null;
}): string[] =>
  collectRenderedNodes(view.toJSON())
    .map((node) => node.backgroundColor)
    .filter((color): color is string => color !== undefined);

// No `hidden` here, deliberately: these two are the chooser's visible actions,
// so the query doubles as an assertion that they are on screen at all.
const backgroundColorOfTestId = (testID: string): unknown =>
  StyleSheet.flatten(screen.getByTestId(testID).props.style)?.backgroundColor;

describe('ChooserView', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('frames the signin intent as a return, naming what is waiting', () => {
    renderChooser({ intent: 'signin' });

    expect(screen.getByText('Welcome back')).toBeOnTheScreen();
    expect(
      screen.getByText('Your hero, quest history, and guild are waiting.')
    ).toBeOnTheScreen();
  });

  it('frames the convert intent as saving progress, naming the hero', () => {
    renderChooser({ intent: 'convert', heroName: HERO_NAME });

    expect(screen.getByText('Save your progress')).toBeOnTheScreen();
    expect(
      screen.getByText("Keep Thornwake and everything you've earned.")
    ).toBeOnTheScreen();
  });

  // The character store's own default is `character: null`, so a caller passing
  // `character?.name` genuinely has nothing to pass. The fallback string lives
  // in `copy.ts`; what this pins is that the view forwards the absent value
  // instead of substituting a name of its own.
  it('forwards an absent hero name to the copy table rather than guarding it', () => {
    renderChooser({ intent: 'convert', heroName: null });

    expect(
      screen.getByText("Keep your hero and everything you've earned.")
    ).toBeOnTheScreen();
  });

  it('shows the error banner when there is an error to show', () => {
    renderChooser({ error: ERROR_MESSAGE });

    expect(screen.getByTestId('error-message', hidden)).toBeOnTheScreen();
    expect(screen.getByText(ERROR_MESSAGE)).toBeOnTheScreen();
  });

  it('renders no error banner when there is no error', () => {
    renderChooser({ error: '' });

    expect(screen.queryByTestId('error-message', hidden)).toBeNull();
  });

  it('puts the social options first, then the divider, then the email path', () => {
    const view = renderChooser();

    // Filtered to the three platform-independent landmarks: the Apple button is
    // iOS-only, and `Button` also emits a `-wrapper` node per action.
    const order = collectRenderedNodes(view.toJSON())
      .map((node) => node.testID)
      .filter(
        (testID) =>
          testID === 'google-sign-in-button' ||
          testID === 'social-signin-divider' ||
          testID === 'continue-with-email-button'
      );

    expect(order).toEqual([
      'google-sign-in-button',
      'social-signin-divider',
      'continue-with-email-button',
    ]);
    expect(screen.getByText('Continue with email')).toBeOnTheScreen();
  });

  it('hands the email step to the caller when Continue with email is pressed', () => {
    const { onContinueWithEmail } = renderChooser();

    fireEvent.press(screen.getByTestId('continue-with-email-button'));

    expect(onContinueWithEmail).toHaveBeenCalledTimes(1);
  });

  // Spec §2: the chooser has NO Cinnabar action. Orange is scarce in this
  // brand, and the email step's "Send sign-in link" is where it is spent — so
  // neither the Google button (via `googlePrimary`) nor "Continue with email"
  // may claim it.
  it('spends no ember primary: nothing on the chooser paints Cinnabar', () => {
    const view = renderChooser();
    const backgrounds = backgroundColorsOf(view);

    // The real assertion first, so an ember leak is what a failure reports —
    // and it prints the received array, naming the colour that appeared.
    expect(backgrounds).not.toContain(colors.accent.primary);
    // Positive control second: `not.toContain` over an empty list passes
    // vacuously, so this is what catches a walk that stopped reading painted
    // colours at all. `fill.faint` is `variant="secondary"`'s background, i.e.
    // the email button's.
    expect(backgrounds).toContain(colors.fill.faint);

    // Named per action too, so a failure says which one took the ember.
    expect(backgroundColorOfTestId('google-sign-in-button')).toBe(
      'transparent'
    );
    expect(backgroundColorOfTestId('continue-with-email-button')).toBe(
      colors.fill.faint
    );
  });

  it('states the legal terms and links them to the hosted document', () => {
    renderChooser();

    expect(
      screen.getByText(
        'By continuing you agree to our Terms and Privacy Policy.'
      )
    ).toBeOnTheScreen();

    fireEvent.press(screen.getByText('Terms and Privacy Policy'));

    expect(Linking.openURL).toHaveBeenCalledWith(TERMS_URL);
  });
});
