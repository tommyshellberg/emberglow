import { Platform } from 'react-native';
import { OneSignal } from 'react-native-onesignal';

import {
  flipLiveActivityToFailed,
  flipLiveActivityToGrace,
  revertLiveActivityToActive,
} from './presence-live-activity';

const startDefault = OneSignal.LiveActivities.startDefault as jest.Mock;

const params = {
  activityId: 'activity-1',
  title: 'Test quest',
  durationMinutes: 30,
};

describe('presence-live-activity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Platform.OS = 'ios';
  });

  it('flipLiveActivityToGrace sends status warning with graceEndsAt in epoch seconds', () => {
    flipLiveActivityToGrace({ ...params, graceEndsAt: 1_000_000_000_000 });
    expect(startDefault).toHaveBeenCalledWith(
      'activity-1',
      { title: 'Test quest' },
      { durationMinutes: 30, status: 'warning', graceEndsAt: 1_000_000_000 }
    );
  });

  it('revertLiveActivityToActive sends status active anchored at startedAt', () => {
    revertLiveActivityToActive({ ...params, startedAt: 1_000_000_000_000 });
    expect(startDefault).toHaveBeenCalledWith(
      'activity-1',
      { title: 'Test quest' },
      { durationMinutes: 30, status: 'active', startedAt: 1_000_000_000 }
    );
  });

  it('flipLiveActivityToFailed sends status failed (copy is Swift-owned)', () => {
    flipLiveActivityToFailed(params);
    expect(startDefault).toHaveBeenCalledWith(
      'activity-1',
      { title: 'Test quest' },
      { durationMinutes: 30, status: 'failed' }
    );
  });

  it('no-ops without an activity id', () => {
    flipLiveActivityToGrace({
      ...params,
      activityId: null,
      graceEndsAt: 1_000,
    });
    expect(startDefault).not.toHaveBeenCalled();
  });

  it('no-ops on Android (Live Activities are iOS-only)', () => {
    Platform.OS = 'android';
    flipLiveActivityToFailed(params);
    expect(startDefault).not.toHaveBeenCalled();
  });

  it('swallows OneSignal errors (a tile update must never crash the runtime)', () => {
    startDefault.mockImplementationOnce(() => {
      throw new Error('bridge down');
    });
    expect(() => flipLiveActivityToFailed(params)).not.toThrow();
  });
});
