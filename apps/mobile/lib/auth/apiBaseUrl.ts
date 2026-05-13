import Constants from 'expo-constants';

export function getApiBaseUrl(): string {
  const fromExtra = (Constants.expoConfig?.extra?.apiBaseUrl ?? null) as string | null;
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL ?? null;
  const url = fromExtra ?? fromEnv;

  if (!url) {
    throw new Error(
      'API base URL is not configured. Set EXPO_PUBLIC_API_BASE_URL, NEXT_PUBLIC_APP_URL, or app.json:expo.extra.apiBaseUrl.',
    );
  }

  return url.replace(/\/$/, '');
}
