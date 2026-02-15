import type { ISaveManager } from './ISaveManager.js';
import { LocalStorageAdapter } from './LocalStorageAdapter.js';

export interface CloudSaveConfig {
  endpoint: string;
  userId: string;
  headers?: Record<string, string>;
}

/**
 * Cloud save with local fallback. Writes to localStorage immediately
 * and syncs to a remote endpoint asynchronously.
 */
export class CloudSaveAdapter implements ISaveManager {
  private local: LocalStorageAdapter;
  private endpoint: string;
  private userId: string;
  private headers: Record<string, string>;

  constructor(config: CloudSaveConfig) {
    this.local = new LocalStorageAdapter('cloud_');
    this.endpoint = config.endpoint;
    this.userId = config.userId;
    this.headers = {
      'Content-Type': 'application/json',
      ...config.headers,
    };
  }

  async save<T>(key: string, data: T): Promise<void> {
    // Save locally first (fast)
    await this.local.save(key, data);

    // Sync to cloud
    try {
      await fetch(`${this.endpoint}/save`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({ userId: this.userId, key, data }),
      });
    } catch {
      // Offline — will sync later
    }
  }

  async load<T>(key: string): Promise<T | null> {
    // Try cloud first
    try {
      const res = await fetch(`${this.endpoint}/load?userId=${this.userId}&key=${key}`, {
        headers: this.headers,
      });
      if (res.ok) {
        const json = await res.json();
        // Update local cache
        await this.local.save(key, json.data);
        return json.data as T;
      }
    } catch {
      // Offline
    }
    // Fallback to local
    return this.local.load<T>(key);
  }

  async delete(key: string): Promise<void> {
    await this.local.delete(key);
    try {
      await fetch(`${this.endpoint}/delete`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({ userId: this.userId, key }),
      });
    } catch {
      // Offline
    }
  }

  async has(key: string): Promise<boolean> {
    return this.local.has(key);
  }

  async clear(): Promise<void> {
    await this.local.clear();
  }

  saveImmediate<T>(key: string, data: T): void {
    this.local.saveImmediate(key, data);
  }
}
