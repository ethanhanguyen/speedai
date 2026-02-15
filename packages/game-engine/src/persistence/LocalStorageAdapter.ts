import type { ISaveManager } from './ISaveManager.js';

export class LocalStorageAdapter implements ISaveManager {
  private readonly prefix: string;

  constructor(prefix = 'game_') {
    this.prefix = prefix;
  }

  async save<T>(key: string, data: T): Promise<void> {
    this.saveImmediate(key, data);
  }

  async load<T>(key: string): Promise<T | null> {
    try {
      const raw = localStorage.getItem(this.prefix + key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    localStorage.removeItem(this.prefix + key);
  }

  async has(key: string): Promise<boolean> {
    return localStorage.getItem(this.prefix + key) !== null;
  }

  async clear(): Promise<void> {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(this.prefix)) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  }

  saveImmediate<T>(key: string, data: T): void {
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(data));
    } catch {
      // Storage full — silent fail
    }
  }
}
