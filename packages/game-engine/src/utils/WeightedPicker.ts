export class WeightedPicker<T> {
  private history: T[] = [];
  private maxHistory: number = 0;

  /**
   * Enable history tracking to penalize recently picked items.
   * @param maxHistory Number of recent picks to track
   * @returns this for chaining
   */
  withHistory(maxHistory: number): this {
    this.maxHistory = maxHistory;
    this.history = [];
    return this;
  }

  /**
   * Pick a single item using weighted random selection.
   * @param items Array of items to pick from
   * @param weightFn Function that returns weight for each item (higher = more likely)
   * @returns Selected item
   */
  pick(items: T[], weightFn: (item: T) => number): T {
    if (items.length === 0) {
      throw new Error('Cannot pick from empty array');
    }

    const weights = items.map(item => {
      let weight = weightFn(item);

      // Apply history penalty if enabled
      if (this.maxHistory > 0) {
        const recentCount = this.history.filter(h => h === item).length;
        weight *= Math.pow(0.5, recentCount); // Exponential penalty
      }

      return Math.max(weight, 0.0001); // Prevent zero weights
    });

    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < items.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        const selected = items[i];

        // Update history if enabled
        if (this.maxHistory > 0) {
          this.history.push(selected);
          if (this.history.length > this.maxHistory) {
            this.history.shift();
          }
        }

        return selected;
      }
    }

    // Fallback (should never reach here due to floating point)
    return items[items.length - 1];
  }

  /**
   * Pick multiple items using weighted random selection.
   * @param items Array of items to pick from
   * @param n Number of items to pick
   * @param weightFn Function that returns weight for each item
   * @returns Array of selected items (may contain duplicates)
   */
  pickN(items: T[], n: number, weightFn: (item: T) => number): T[] {
    const results: T[] = [];
    for (let i = 0; i < n; i++) {
      results.push(this.pick(items, weightFn));
    }
    return results;
  }

  /**
   * Reset history tracking.
   */
  resetHistory(): void {
    this.history = [];
  }
}
