/**
 * Single source of truth for which routes inside the `(app)` tab navigator
 * hide the bottom tab bar.
 *
 * Two consumers depend on the same answer, and they must not drift:
 *
 * 1. `src/app/(app)/_layout.tsx` — sets `tabBarStyle.display` from it.
 * 2. `ScreenContainer` — decides whether it has to reserve `insets.bottom`
 *    itself, or whether the visible tab bar already spans it.
 *
 * The tab bar is the only thing that spans the bottom safe-area inset on tab
 * screens (`height: 56 + insets.bottom`, `paddingBottom: insets.bottom`), so
 * when it's hidden nothing does — content would sit under the Android
 * navigation bar. Asking react-navigation is not an option: `getTabBarHeight`
 * returns the numeric `tabBarStyle.height` verbatim with no regard for
 * `display`, and `BottomTabBarHeightContext` is frozen at mount
 * (`setTabBarHeight` is never called), so it reports a tab bar that isn't
 * there. Hence a declared list rather than a runtime probe.
 */

/** Tab-navigator routes that render with the tab bar hidden. */
const ROUTES_HIDING_TAB_BAR = [
  'pending-quest',
  'quest-discovery',
  'invitation-waiting',
] as const;

/** Route-name prefixes whose whole subtree hides the tab bar. */
const PREFIXES_HIDING_TAB_BAR = ['quest/'] as const;

/**
 * Whether the given tab-navigator route renders with the tab bar hidden.
 *
 * Only meaningful for routes inside the `(app)` tab navigator. Callers
 * outside it (root-stack screens) have no tab bar at all and should not
 * consult this — see `ScreenContainer`, which gates on the tab bar height
 * context first.
 */
export function hidesTabBar(routeName: string | undefined): boolean {
  if (!routeName) {
    return false;
  }

  return (
    (ROUTES_HIDING_TAB_BAR as readonly string[]).includes(routeName) ||
    PREFIXES_HIDING_TAB_BAR.some((prefix) => routeName.startsWith(prefix))
  );
}
