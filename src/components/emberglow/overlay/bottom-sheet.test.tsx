import { BottomSheetModal } from '@gorhom/bottom-sheet';
import * as React from 'react';
import { Text } from 'react-native';

import { render, renderHook, screen } from '@/lib/test-utils';

import { BottomSheet, useEmberglowBottomSheet } from './bottom-sheet';

describe('BottomSheet', () => {
  it('renders the title', () => {
    render(
      <BottomSheet title="New: Skill Trees">
        <Text>Unlock perks that grow with your journey.</Text>
      </BottomSheet>
    );

    expect(screen.getByText('New: Skill Trees')).toBeOnTheScreen();
  });

  it('renders its children', () => {
    render(
      <BottomSheet title="New: Skill Trees">
        <Text>Unlock perks that grow with your journey.</Text>
      </BottomSheet>
    );

    expect(
      screen.getByText('Unlock perks that grow with your journey.')
    ).toBeOnTheScreen();
  });

  it('renders without a title block when no title is provided', () => {
    render(
      <BottomSheet>
        <Text>Just content</Text>
      </BottomSheet>
    );

    expect(screen.getByText('Just content')).toBeOnTheScreen();
  });

  it('forwards onDismiss to the underlying BottomSheetModal', () => {
    const onDismiss = jest.fn();

    render(
      <BottomSheet title="New: Skill Trees" onDismiss={onDismiss}>
        <Text>Unlock perks that grow with your journey.</Text>
      </BottomSheet>
    );

    const mockedBottomSheetModal = BottomSheetModal as unknown as jest.Mock;
    const lastCallProps =
      mockedBottomSheetModal.mock.calls[
        mockedBottomSheetModal.mock.calls.length - 1
      ][0];

    expect(lastCallProps.onDismiss).toBe(onDismiss);
  });
});

describe('useEmberglowBottomSheet', () => {
  it('calls dismiss on the attached ref when dismiss() is invoked', () => {
    const { result } = renderHook(() => useEmberglowBottomSheet());
    const dismiss = jest.fn();
    (
      result.current.ref as React.MutableRefObject<BottomSheetModal | null>
    ).current = { dismiss } as unknown as BottomSheetModal;

    result.current.dismiss();

    expect(dismiss).toHaveBeenCalledTimes(1);
  });

  it('calls present on the attached ref, forwarding data, when present() is invoked', () => {
    const { result } = renderHook(() => useEmberglowBottomSheet());
    const present = jest.fn();
    (
      result.current.ref as React.MutableRefObject<BottomSheetModal | null>
    ).current = { present } as unknown as BottomSheetModal;

    result.current.present({ foo: 'bar' });

    expect(present).toHaveBeenCalledWith({ foo: 'bar' });
  });

  it('is a no-op when the ref is not attached to a mounted sheet', () => {
    const { result } = renderHook(() => useEmberglowBottomSheet());

    expect(() => result.current.dismiss()).not.toThrow();
    expect(() => result.current.present()).not.toThrow();
  });
});
