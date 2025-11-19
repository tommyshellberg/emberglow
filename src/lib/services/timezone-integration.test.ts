/**
 * Integration test to verify timezone detection works with the React Native app
 */
import { getTimeZone } from 'react-native-localize';

import { getDeviceTimezone } from './timezone-service';

// Get the mocked function
const mockGetTimeZone = getTimeZone as jest.MockedFunction<typeof getTimeZone>;

describe('Timezone Integration', () => {
  it('should correctly detect device timezone from react-native-localize', () => {
    const testTimezone = 'America/Chicago';
    mockGetTimeZone.mockReturnValue(testTimezone);

    const detectedTimezone = getDeviceTimezone();

    expect(detectedTimezone).toBe(testTimezone);
  });

  it('should handle different timezone formats', () => {
    const timezones = [
      'America/New_York',
      'Europe/London',
      'Asia/Tokyo',
      'Australia/Sydney',
      'UTC',
    ];

    timezones.forEach((tz) => {
      mockGetTimeZone.mockReturnValue(tz);
      expect(getDeviceTimezone()).toBe(tz);
    });
  });
});
