/**
 * Manual Jest mock for react-native-gesture-handler.
 *
 * History: this file used to replace the whole package with
 * `react-native-gesture-handler/src/mocks.ts`. That broke twice over:
 * the installed 2.20.2 ships `src/mocks.tsx` (so the require failed at
 * load time for every suite that imports the package), and `src/mocks`
 * only stubs the internal pieces — it never exported the public API
 * (`Gesture`, `GestureDetector`, `GestureHandlerRootView`), which is why
 * `GestureDetector` could not render in tests.
 *
 * Fix: mirror the package's official `jestSetup.js` — mock only the
 * internal `RNGestureHandlerModule` with the shipped mocks (extension-less
 * so Jest resolves the .tsx it actually ships), then return the real
 * public JS API on top of the mocked native layer.
 */
jest.mock('react-native-gesture-handler/src/RNGestureHandlerModule', () =>
  require('react-native-gesture-handler/src/mocks')
);

module.exports = jest.requireActual('react-native-gesture-handler');
