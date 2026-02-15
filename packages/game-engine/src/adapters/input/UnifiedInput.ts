import type { IInputManager, GestureType, GestureCallback, GestureEvent } from '../../core/types.js';

const SWIPE_THRESHOLD = 30;
const LONGPRESS_DURATION = 500;

export class UnifiedInput implements IInputManager {
  private keys: Set<string> = new Set();
  private prevKeys: Set<string> = new Set();
  private pointer = { x: 0, y: 0, down: false };
  private gestureListeners: Map<GestureType, Set<GestureCallback>> = new Map();
  private active = false;

  // Gesture tracking
  private pointerStart: { x: number; y: number; time: number } | null = null;
  private longPressTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly element: HTMLElement;

  constructor(element?: HTMLElement) {
    this.element = element ?? document.body;
  }

  // ─── Key Bindings ───

  private onKeyDown = (e: KeyboardEvent): void => {
    this.keys.add(e.code);
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
  };

  // ─── Pointer Bindings ───

  private onPointerDown = (e: PointerEvent): void => {
    const rect = this.element.getBoundingClientRect();
    this.pointer.x = e.clientX - rect.left;
    this.pointer.y = e.clientY - rect.top;
    this.pointer.down = true;
    this.pointerStart = { x: e.clientX, y: e.clientY, time: performance.now() };

    // Long press detection
    this.longPressTimer = setTimeout(() => {
      if (this.pointer.down && this.pointerStart) {
        const dx = Math.abs(this.pointer.x - this.pointerStart.x);
        const dy = Math.abs(this.pointer.y - this.pointerStart.y);
        if (dx < 10 && dy < 10) {
          this.emitGesture({
            type: 'longpress',
            x: this.pointer.x,
            y: this.pointer.y,
          });
        }
      }
    }, LONGPRESS_DURATION);
  };

  private onPointerMove = (e: PointerEvent): void => {
    const rect = this.element.getBoundingClientRect();
    this.pointer.x = e.clientX - rect.left;
    this.pointer.y = e.clientY - rect.top;
  };

  private onPointerUp = (e: PointerEvent): void => {
    this.pointer.down = false;
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }

    if (this.pointerStart) {
      const rect = this.element.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const dx = x - this.pointerStart.x;
      const dy = y - this.pointerStart.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const elapsed = performance.now() - this.pointerStart.time;

      if (dist < 10 && elapsed < LONGPRESS_DURATION) {
        // Tap
        this.emitGesture({ type: 'tap', x, y });
      } else if (dist >= SWIPE_THRESHOLD) {
        // Swipe
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);
        let direction: GestureEvent['direction'];
        if (absDx > absDy) {
          direction = dx > 0 ? 'right' : 'left';
        } else {
          direction = dy > 0 ? 'down' : 'up';
        }
        this.emitGesture({
          type: 'swipe',
          x,
          y,
          deltaX: dx,
          deltaY: dy,
          direction,
        });
      }
      this.pointerStart = null;
    }
  };

  // ─── Public API ───

  isPressed(key: string): boolean {
    return this.keys.has(key);
  }

  isJustPressed(key: string): boolean {
    return this.keys.has(key) && !this.prevKeys.has(key);
  }

  getPointer(): { x: number; y: number; down: boolean } {
    return { x: this.pointer.x, y: this.pointer.y, down: this.pointer.down };
  }

  onGesture(type: GestureType, callback: GestureCallback): void {
    let set = this.gestureListeners.get(type);
    if (!set) {
      set = new Set();
      this.gestureListeners.set(type, set);
    }
    set.add(callback);
  }

  offGesture(type: GestureType, callback: GestureCallback): void {
    this.gestureListeners.get(type)?.delete(callback);
  }

  enable(): void {
    if (this.active) return;
    this.active = true;
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    this.element.addEventListener('pointerdown', this.onPointerDown);
    this.element.addEventListener('pointermove', this.onPointerMove);
    this.element.addEventListener('pointerup', this.onPointerUp);
    this.element.addEventListener('pointercancel', this.onPointerUp);
  }

  disable(): void {
    if (!this.active) return;
    this.active = false;
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.element.removeEventListener('pointerdown', this.onPointerDown);
    this.element.removeEventListener('pointermove', this.onPointerMove);
    this.element.removeEventListener('pointerup', this.onPointerUp);
    this.element.removeEventListener('pointercancel', this.onPointerUp);
    this.keys.clear();
    this.prevKeys.clear();
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  /** Called at the start of each frame to snapshot previous key state. */
  update(): void {
    this.prevKeys = new Set(this.keys);
  }

  // ─── Internal ───

  private emitGesture(event: GestureEvent): void {
    const listeners = this.gestureListeners.get(event.type);
    if (!listeners) return;
    for (const cb of listeners) {
      cb(event);
    }
  }
}
