import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ACCESS_TOKEN_KEY = 'forti.accessToken';
const ACCESS_TOKEN_EXP_KEY = 'forti.accessTokenExpiresAt';
const REFRESH_TOKEN_KEY = 'forti.refreshToken';
const REFRESH_TOKEN_EXP_KEY = 'forti.refreshTokenExpiresAt';
const USER_KEY = 'forti.user';

type Storage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  deleteItem: (key: string) => Promise<void>;
};

const webStorage: Storage = {
  getItem: async (key) => {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(key);
  },
  setItem: async (key, value) => {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(key, value);
  },
  deleteItem: async (key) => {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(key);
  },
};

const nativeStorage: Storage = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  deleteItem: (key) => SecureStore.deleteItemAsync(key),
};

const storage: Storage = Platform.OS === 'web' ? webStorage : nativeStorage;

export type StoredAuthSession = {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
  user: { id: string; email: string; name: string | null };
};

export async function readStoredSession(): Promise<StoredAuthSession | null> {
  const [accessToken, accessTokenExpiresAt, refreshToken, refreshTokenExpiresAt, userJson] =
    await Promise.all([
      storage.getItem(ACCESS_TOKEN_KEY),
      storage.getItem(ACCESS_TOKEN_EXP_KEY),
      storage.getItem(REFRESH_TOKEN_KEY),
      storage.getItem(REFRESH_TOKEN_EXP_KEY),
      storage.getItem(USER_KEY),
    ]);

  if (!accessToken || !accessTokenExpiresAt || !refreshToken || !refreshTokenExpiresAt || !userJson) {
    return null;
  }

  try {
    const user = JSON.parse(userJson) as StoredAuthSession['user'];
    return { accessToken, accessTokenExpiresAt, refreshToken, refreshTokenExpiresAt, user };
  } catch {
    return null;
  }
}

export async function writeStoredSession(session: StoredAuthSession): Promise<void> {
  await Promise.all([
    storage.setItem(ACCESS_TOKEN_KEY, session.accessToken),
    storage.setItem(ACCESS_TOKEN_EXP_KEY, session.accessTokenExpiresAt),
    storage.setItem(REFRESH_TOKEN_KEY, session.refreshToken),
    storage.setItem(REFRESH_TOKEN_EXP_KEY, session.refreshTokenExpiresAt),
    storage.setItem(USER_KEY, JSON.stringify(session.user)),
  ]);
}

export async function clearStoredSession(): Promise<void> {
  await Promise.all([
    storage.deleteItem(ACCESS_TOKEN_KEY),
    storage.deleteItem(ACCESS_TOKEN_EXP_KEY),
    storage.deleteItem(REFRESH_TOKEN_KEY),
    storage.deleteItem(REFRESH_TOKEN_EXP_KEY),
    storage.deleteItem(USER_KEY),
  ]);
}
