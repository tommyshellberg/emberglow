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

  // @gorhom/bottom-sheet defaults `accessible` to true and puts it on the one
  // view that wraps every child. On iOS that makes the whole sheet a single
  // accessibility element: UIKit drops every descendant and reads the library's
  // own "Bottom Sheet" label instead. VoiceOver users reached nothing inside a
  // sheet, and no testID inside one was findable (SHE-26).
  //
  // Jest cannot reproduce the UIKit behaviour itself — collapsing descendants is
  // something the platform does, not something React Native models — so this
  // asserts the prop contract that stops it. The on-device accessibility dump in
  // the task A1 report is the evidence that the contract has the intended effect.
  it('opts the sheet out of being a single accessibility element', () => {
    render(
      <BottomSheet title="New: Skill Trees">
        <Text>Unlock perks that grow with your journey.</Text>
      </BottomSheet>
    );

    const mockedBottomSheetModal = BottomSheetModal as unknown as jest.Mock;
    const lastCallProps =
      mockedBottomSheetModal.mock.calls[
        mockedBottomSheetModal.mock.calls.length - 1
      ][0];

    expect(lastCallProps.accessible).toBe(false);
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
