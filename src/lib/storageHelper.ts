import AsyncStorage from '@react-native-async-storage/async-storage';

const memoryStore = new Map<string, string>();

/**
 * Robust cross-platform key-value storage wrapper.
 * Uses AsyncStorage on native React Native / web, and memoryStore in headless Node tests.
 */
export const SafeStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      if (typeof window === 'undefined' && typeof navigator === 'undefined') {
        // Node / test runner environment
        return memoryStore.get(key) ?? null;
      }
      return await AsyncStorage.getItem(key);
    } catch {
      return memoryStore.get(key) ?? null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      if (typeof window === 'undefined' && typeof navigator === 'undefined') {
        memoryStore.set(key, value);
        return;
      }
      await AsyncStorage.setItem(key, value);
    } catch {
      memoryStore.set(key, value);
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      if (typeof window === 'undefined' && typeof navigator === 'undefined') {
        memoryStore.delete(key);
        return;
      }
      await AsyncStorage.removeItem(key);
    } catch {
      memoryStore.delete(key);
    }
  },
};
