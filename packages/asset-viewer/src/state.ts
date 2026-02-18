// Phase 3 — Preview Canvas

import type { Asset, Manifest } from './manifest/types.js';
import { DEFAULT_ANIMATION_FPS } from './manifest/constants.js';

export type PlaybackState = 'playing' | 'paused';
export type AppPhase = 'loading' | 'ready' | 'error';

export interface ViewerState {
  readonly phase: AppPhase;
  readonly manifest: Manifest | null;
  readonly selectedAsset: Asset | null;
  readonly playback: PlaybackState;
  readonly fps: number;
  readonly currentFrame: number;
  readonly scale: number;
  readonly filterText: string;
}

const INITIAL_STATE: ViewerState = {
  phase: 'loading',
  manifest: null,
  selectedAsset: null,
  playback: 'paused',
  fps: DEFAULT_ANIMATION_FPS,
  currentFrame: 0,
  scale: 1,
  filterText: '',
};

type Key = keyof ViewerState;
type Listener<T> = (value: T) => void;

class Store {
  private state: ViewerState = { ...INITIAL_STATE };
  private readonly listeners = new Map<Key, Set<Listener<unknown>>>();

  get<K extends Key>(key: K): ViewerState[K] {
    return this.state[key];
  }

  set<K extends Key>(key: K, value: ViewerState[K]): void {
    if ((this.state[key] as unknown) === (value as unknown)) return;
    (this.state as Record<Key, unknown>)[key] = value;
    this.listeners.get(key)?.forEach(fn => fn(value as unknown));
  }

  on<K extends Key>(key: K, fn: Listener<ViewerState[K]>): () => void {
    if (!this.listeners.has(key)) this.listeners.set(key, new Set());
    this.listeners.get(key)!.add(fn as Listener<unknown>);
    return () => this.listeners.get(key)?.delete(fn as Listener<unknown>);
  }
}

export const store = new Store();
