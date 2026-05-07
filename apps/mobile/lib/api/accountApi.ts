import {
  UserProfileSchema,
  UserProfileUpdateRequestSchema,
  UserSettingsResponseSchema,
  UserSettingsUpdateRequestSchema,
  type UserProfile,
  type UserSettings,
  type UserSettingsUpdateRequest,
} from '@forti/shared';

import type { createMobileApiClient } from './mobileApiClient';

type MobileApiClient = ReturnType<typeof createMobileApiClient>;

export async function getUserProfile(client: MobileApiClient): Promise<UserProfile> {
  return client.request({
    path: '/api/user/profile',
    schema: UserProfileSchema,
  });
}

export async function updateUserProfile(client: MobileApiClient, name: string): Promise<UserProfile> {
  return client.request({
    body: UserProfileUpdateRequestSchema.parse({ name }),
    method: 'PATCH',
    path: '/api/user/profile',
    schema: UserProfileSchema,
  });
}

export async function getUserSettings(client: MobileApiClient): Promise<UserSettings> {
  const response = await client.request({
    path: '/api/user/settings',
    schema: UserSettingsResponseSchema,
  });
  return response.settings;
}

export async function updateUserSettings(
  client: MobileApiClient,
  settings: UserSettingsUpdateRequest['settings'],
): Promise<UserSettings> {
  const response = await client.request({
    body: UserSettingsUpdateRequestSchema.parse({ settings }),
    method: 'PATCH',
    path: '/api/user/settings',
    schema: UserSettingsResponseSchema,
  });
  return response.settings;
}
