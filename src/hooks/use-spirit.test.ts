import { renderHook } from '@testing-library/react-native';

import { useSpirit } from './use-spirit';

jest.mock('@/lib/spirit', () => ({
  ...jest.requireActual('@/lib/spirit'),
  isSpiritFadingEnabled: jest.fn(() => true),
}));
jest.mock('@/store/character-store');

const { useCharacterStore } = require('@/store/character-store');
const { isSpiritFadingEnabled } = require('@/lib/spirit');

const setStore = (
  serverSpirit: number | null,
  serverSpiritAt: number | null,
  restorationCount = 0
) =>
  (useCharacterStore as jest.Mock).mockImplementation((sel: any) =>
    sel({ serverSpirit, serverSpiritAt, restorationCount })
  );

describe('useSpirit', () => {
  beforeEach(() => {
    (isSpiritFadingEnabled as jest.Mock).mockReturnValue(true);
  });

  it('returns active spirit derived from server anchor', () => {
    setStore(100, Date.now());
    const { result } = renderHook(() => useSpirit());
    expect(result.current.active).toBe(true);
    expect(result.current.spirit).toBe(100);
    expect(result.current.faded).toBe(false);
  });

  it('is inactive when the flag is off', () => {
    (isSpiritFadingEnabled as jest.Mock).mockReturnValueOnce(false);
    setStore(100, Date.now());
    const { result } = renderHook(() => useSpirit());
    expect(result.current.active).toBe(false);
  });

  it('exposes restorationCount from the store', () => {
    setStore(100, Date.now(), 4);
    const { result } = renderHook(() => useSpirit());
    expect(result.current.restorationCount).toBe(4);
  });
});
