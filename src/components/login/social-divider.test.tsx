import { StyleSheet } from 'react-native';

import { render, screen } from '@/lib/test-utils';
import { spacing } from '@/theme';

import { SocialDivider } from './social-divider';

// The divider hides itself from assistive tech, so every query here needs
// `includeHiddenElements` — RNTL skips hidden elements by default.
const hidden = { includeHiddenElements: true } as const;

describe('SocialDivider', () => {
  it('renders an "or" label between two rules', () => {
    render(<SocialDivider />);

    expect(screen.getByText('or', hidden)).toBeOnTheScreen();
  });

  it('exposes the social-signin-divider testID callers select on', () => {
    render(<SocialDivider />);

    expect(screen.getByTestId('social-signin-divider', hidden)).toBeTruthy();
  });

  it('hides itself from assistive tech on BOTH platforms — iOS reads accessibilityElementsHidden, Android reads importantForAccessibility', () => {
    render(<SocialDivider />);

    const divider = screen.getByTestId('social-signin-divider', hidden);

    // Asserted separately rather than as one object so a regression names
    // the platform it broke. Dropping either prop leaves the divider
    // rendering identically, which is why it is pinned here at all.
    expect(divider.props.accessibilityElementsHidden).toBe(true);
    expect(divider.props.importantForAccessibility).toBe('no-hide-descendants');
  });

  it('applies its own default spacing when no style is supplied', () => {
    render(<SocialDivider />);

    const style = StyleSheet.flatten(
      screen.getByTestId('social-signin-divider', hidden).props.style
    );

    // Pinned on the *no-style* render specifically: the merge test below
    // passes `marginTop`, which overrides this default and would mask a
    // change to it. Callers do spacing arithmetic against these constants
    // in prose — quest-completed-signup.tsx's `styles.emailButton` mirrors
    // `marginTop` so the divider reads as centred — so a silent change here
    // breaks a layout claim no other test would catch.
    expect(style).toMatchObject({
      marginTop: spacing[4],
      gap: spacing[3],
    });
  });

  it('merges a caller-supplied style with its own row layout rather than replacing it', () => {
    render(<SocialDivider style={{ marginTop: 40 }} />);

    const style = StyleSheet.flatten(
      screen.getByTestId('social-signin-divider', hidden).props.style
    );

    expect(style).toMatchObject({
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 40,
    });
  });
});
