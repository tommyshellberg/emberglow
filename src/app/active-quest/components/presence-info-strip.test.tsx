import React from 'react';

import { render, screen } from '@/lib/test-utils';

import { PresenceInfoStrip } from './presence-info-strip';

describe('PresenceInfoStrip', () => {
  it('renders the quest mode chip, title, and forecast', () => {
    render(
      <PresenceInfoStrip
        mode="story"
        questTitle="The Whispering Glade"
        forecast={{ current: 62, maxIfLocked: 93 }}
      />
    );

    expect(screen.getByText('Story Quest')).toBeTruthy();
    expect(screen.getByText('The Whispering Glade')).toBeTruthy();
    expect(screen.getByText(/62 XP/)).toBeTruthy();
    expect(screen.getByText(/up to 93 if locked/)).toBeTruthy();
  });

  it('falls back to the generic "Quest" chip when mode is undefined', () => {
    render(
      <PresenceInfoStrip
        mode={undefined}
        questTitle={undefined}
        forecast={{ current: 10, maxIfLocked: 15 }}
      />
    );

    expect(screen.getByText('Quest')).toBeTruthy();
  });

  it('omits the title line when questTitle is undefined', () => {
    render(
      <PresenceInfoStrip
        mode="custom"
        questTitle={undefined}
        forecast={{ current: 10, maxIfLocked: 15 }}
      />
    );

    expect(screen.queryByText('undefined')).toBeNull();
  });
});
