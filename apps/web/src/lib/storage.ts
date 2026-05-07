// Cross-platform key-value storage. Web impl uses localStorage. An RN port
// should swap this file for an MMKV/AsyncStorage-backed equivalent that
// satisfies the same `Storage` shape — call sites should not change.

export type Storage = {
  getString(key: string): string | null;
  setString(key: string, value: string): void;
  remove(key: string): void;
  getJson<T>(key: string): T | null;
  setJson(key: string, value: unknown): void;
};

const isBrowser = typeof window !== 'undefined';

function safeGet(key: string): string | null {
  if (!isBrowser) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Quota exceeded or storage disabled; non-fatal.
  }
}

function safeRemove(key: string): void {
  if (!isBrowser) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Non-fatal.
  }
}

export const storage: Storage = {
  getString: safeGet,
  setString: safeSet,
  remove: safeRemove,
  getJson<T>(key: string): T | null {
    const raw = safeGet(key);
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },
  setJson(key: string, value: unknown): void {
    try {
      safeSet(key, JSON.stringify(value));
    } catch {
      // Stringify can fail (circular refs); non-fatal.
    }
  },
};
