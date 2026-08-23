import { hidesTabBar } from './tab-bar-routes';

// This list is consumed twice — (app)/_layout.tsx sets tabBarStyle.display
// from it, and useBottomSafeAreaInset decides whether content must reserve
// insets.bottom from it. Dropping an entry silently puts that route's buttons
// under the Android navigation bar, so the membership is asserted directly.
describe('hidesTabBar', () => {
  it.each([
    'quest/[id]',
    'quest/reflection',
    'quest-discovery',
    'invitation-waiting',
    'pending-quest',
  ])('reports the tab bar hidden on %s', (routeName) => {
    expect(hidesTabBar(routeName)).toBe(true);
  });

  it.each(['journal', 'map', 'index', 'profile', 'settings'])(
    'reports the tab bar visible on %s',
    (routeName) => {
      expect(hidesTabBar(routeName)).toBe(false);
    }
  );

  // Routes registered with href:null still show the bar — they are pushed
  // inside the tab navigator and were never in the hide list.
  it.each(['leaderboard', 'achievements', 'skill-tree', 'custom-quest'])(
    'leaves the tab bar visible on the in-tab route %s',
    (routeName) => {
      expect(hidesTabBar(routeName)).toBe(false);
    }
  );

  // ScreenContainer passes route?.name, which is undefined outside a screen.
  it('treats an unknown route as not hiding the bar', () => {
    expect(hidesTabBar(undefined)).toBe(false);
  });

  // 'quest-discovery' must not be matched by the 'quest/' prefix rule, and
  // 'quest/' must not swallow unrelated names that merely start with "quest".
  it('matches the quest subtree by path segment, not by bare prefix', () => {
    expect(hidesTabBar('questionnaire')).toBe(false);
    expect(hidesTabBar('quest/anything/nested')).toBe(true);
  });
});
