import { fireEvent } from '@testing-library/react-native';
import React from 'react';

import { render, screen } from '@/lib/test-utils';

import { AmbientMusicPill } from './ambient-music-pill';

describe('AmbientMusicPill', () => {
  it('shows the ambient track name when unmuted', () => {
    render(<AmbientMusicPill isMuted={false} />);

    expect(screen.getByText(/Ambient: Emberglow Nights/)).toBeTruthy();
  });

  it('reflects the muted state visually via its accessibility label', () => {
    render(<AmbientMusicPill isMuted />);

    expect(screen.getByLabelText('Unmute ambient music')).toBeTruthy();
  });

  it('calls onToggleMute when pressed', () => {
    const onToggleMute = jest.fn();
    render(<AmbientMusicPill isMuted={false} onToggleMute={onToggleMute} />);

    fireEvent.press(screen.getByLabelText('Mute ambient music'));

    expect(onToggleMute).toHaveBeenCalledTimes(1);
  });
});
