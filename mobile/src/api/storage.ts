// Offline-first read cache and secure storage abstraction for React Native / Expo companion app
export interface CachedResponse {
  key: string;
  data: any;
  timestamp: number;
}

class OfflineStorage {
  private cache: Map<string, CachedResponse> = new Map();
  private token: string | null = null;

  async setToken(token: string): Promise<void> {
    this.token = token;
    // In React Native native app, persists to expo-secure-store
  }

  async getToken(): Promise<string | null> {
    return this.token;
  }

  async setCache(key: string, data: any): Promise<void> {
    this.cache.set(key, {
      key,
      data,
      timestamp: Date.now(),
    });
    // In React Native app, persists to local SQLite cache database for offline reads (§14)
  }

  async getCache<T>(key: string): Promise<T | null> {
    const item = this.cache.get(key);
    if (!item) {
      return null;
    }
    // Return cached read even offline
    return item.data as T;
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.token = null;
  }
}

export const offlineStorage = new OfflineStorage();
