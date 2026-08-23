import { apiClient } from './common/client';

export interface NotificationSettings {
  timezone: string;
  nudges: {
    enabled: boolean;
  };
}

export const getNotificationSettings =
  async (): Promise<NotificationSettings> => {
    const response = await apiClient.get('/users/me/notification-settings');
    return response.data;
  };

export const updateNotificationSettings = async (
  settings: Partial<NotificationSettings>
): Promise<NotificationSettings> => {
  const response = await apiClient.patch(
    '/users/me/notification-settings',
    settings
  );
  return response.data;
};
