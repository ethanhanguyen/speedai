export interface ISaveManager {
  save<T>(key: string, data: T): Promise<void>;
  load<T>(key: string): Promise<T | null>;
  delete(key: string): Promise<void>;
  has(key: string): Promise<boolean>;
  clear(): Promise<void>;
  /** Flush immediately (used on beforeunload). */
  saveImmediate<T>(key: string, data: T): void;
}
