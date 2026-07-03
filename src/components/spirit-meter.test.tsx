import { render, screen } from '@/lib/test-utils';

import { SpiritMeter } from './spirit-meter';

jest.mock('@/hooks/use-spirit');
const mockUseSpirit = require('@/hooks/use-spirit').useSpirit as jest.Mock;

describe('SpiritMeter', () => {
  it('renders 5 segments with 3 filled at spirit 60', () => {
    mockUseSpirit.mockReturnValue({
      spirit: 60,
      faded: false,
      active: true,
      restorationCount: 0,
    });
    render(<SpiritMeter />);
    expect(screen.getAllByTestId('spirit-segment')).toHaveLength(5);
    expect(screen.getAllByTestId('spirit-segment-filled')).toHaveLength(3);
  });

  it('renders 1 filled segment at spirit 20', () => {
    mockUseSpirit.mockReturnValue({
      spirit: 20,
      faded: false,
      active: true,
      restorationCount: 0,
    });
    render(<SpiritMeter />);
    expect(screen.getAllByTestId('spirit-segment-filled')).toHaveLength(1);
  });

  it('renders 0 filled at spirit 0 (faded)', () => {
    mockUseSpirit.mockReturnValue({
      spirit: 0,
      faded: true,
      active: true,
      restorationCount: 0,
    });
    render(<SpiritMeter />);
    expect(screen.queryAllByTestId('spirit-segment-filled')).toHaveLength(0);
  });

  it('renders nothing when inactive', () => {
    mockUseSpirit.mockReturnValue({
      spirit: null,
      faded: false,
      active: false,
      restorationCount: 0,
    });
    const { toJSON } = render(<SpiritMeter />);
    expect(toJSON()).toBeNull();
  });
});
