import { BottomSheetModal } from '@gorhom/bottom-sheet';
import * as React from 'react';
import { Text } from 'react-native';

import { render } from '@/lib/test-utils';

import { Modal } from './modal';

describe('Modal', () => {
  // Same defect as `emberglow/overlay/bottom-sheet.tsx` (SHE-26), in the second
  // sheet wrapper. @gorhom/bottom-sheet defaults `accessible` to true on the
  // view wrapping every child, which on iOS collapses the whole sheet into one
  // accessibility element and hides everything inside it — the settings sheets,
  // the select sheets, the invite and guild sheets.
  //
  // Jest cannot reproduce the UIKit collapsing itself, so this asserts the prop
  // contract that prevents it.
  it('opts the sheet out of being a single accessibility element', () => {
    render(
      <Modal title="Settings">
        <Text>Sheet content</Text>
      </Modal>
    );

    const mockedBottomSheetModal = BottomSheetModal as unknown as jest.Mock;
    const lastCallProps =
      mockedBottomSheetModal.mock.calls[
        mockedBottomSheetModal.mock.calls.length - 1
      ][0];

    expect(lastCallProps.accessible).toBe(false);
  });
});
