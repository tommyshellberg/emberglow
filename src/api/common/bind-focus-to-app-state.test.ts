import { focusManager } from '@tanstack/react-query';
import { AppState } from 'react-native';

import { bindFocusManagerToAppState } from './bind-focus-to-app-state';

describe('bindFocusManagerToAppState', () => {
  let listener: (state: string) => void;
  const remove = jest.fn();

  beforeEach(() => {
    jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_type, handler) => {
        listener = handler as any;
        return { remove } as any;
      });
    jest.spyOn(focusManager, 'setFocused');
  });
  afterEach(() => jest.restoreAllMocks());

  it('marks React Query focused when the app becomes active', () => {
    bindFocusManagerToAppState();
    listener('active');
    expect(focusManager.setFocused).toHaveBeenLastCalledWith(true);
  });

  it('marks React Query unfocused when the app goes to the background', () => {
    bindFocusManagerToAppState();
    listener('background');
    expect(focusManager.setFocused).toHaveBeenLastCalledWith(false);
  });

  it('returns an unsubscribe that removes the listener', () => {
    bindFocusManagerToAppState()();
    expect(remove).toHaveBeenCalled();
  });
});
