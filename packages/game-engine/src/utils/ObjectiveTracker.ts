export interface ObjectiveDef {
  id: string;
  target: number;
}

export interface ObjectiveState {
  id: string;
  target: number;
  current: number;
}

export class ObjectiveTracker {
  private objectives = new Map<string, ObjectiveState>();

  add(def: ObjectiveDef): void {
    this.objectives.set(def.id, { id: def.id, target: def.target, current: 0 });
  }

  increment(id: string, amount = 1): void {
    const obj = this.objectives.get(id);
    if (obj) {
      obj.current = Math.min(obj.current + amount, obj.target);
    }
  }

  isComplete(id: string): boolean {
    const obj = this.objectives.get(id);
    return obj ? obj.current >= obj.target : false;
  }

  allComplete(): boolean {
    for (const obj of this.objectives.values()) {
      if (obj.current < obj.target) return false;
    }
    return this.objectives.size > 0;
  }

  getProgress(id: string): number {
    const obj = this.objectives.get(id);
    if (!obj || obj.target === 0) return 0;
    return Math.min(obj.current / obj.target, 1);
  }

  get(id: string): ObjectiveState | undefined {
    return this.objectives.get(id);
  }

  getAll(): ObjectiveState[] {
    return [...this.objectives.values()];
  }

  reset(): void {
    for (const obj of this.objectives.values()) {
      obj.current = 0;
    }
  }

  clear(): void {
    this.objectives.clear();
  }
}
