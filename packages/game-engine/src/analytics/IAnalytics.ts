export interface IAnalytics {
  trackFrameTime(ms: number): void;
  trackLoadTime(asset: string, ms: number): void;
  trackError(error: Error, context?: Record<string, unknown>): void;
  trackEvent(name: string, data?: Record<string, unknown>): void;
  startSession(): void;
  endSession(): void;
  flush(): Promise<void>;
}

/**
 * Performance monitor that samples frame times and reports jank.
 */
export class PerformanceMonitor {
  private samples: number[] = [];
  private readonly sampleSize: number;
  private analytics: IAnalytics | null = null;

  constructor(sampleSize = 60) {
    this.sampleSize = sampleSize;
  }

  setAnalytics(analytics: IAnalytics): void {
    this.analytics = analytics;
  }

  sample(frameTime: number): void {
    this.samples.push(frameTime);
    if (this.samples.length >= this.sampleSize) {
      this.report();
      this.samples.length = 0;
    }
  }

  private report(): void {
    const avg = this.samples.reduce((a, b) => a + b) / this.samples.length;
    const max = Math.max(...this.samples);
    const jank = this.samples.filter(t => t > 50).length;

    if (avg > 20 || jank > 5) {
      this.analytics?.trackEvent('performance_warning', { avg, max, jank });
    }
  }

  getStats(): { avgFrameTime: number; maxFrameTime: number; jankFrames: number } {
    if (this.samples.length === 0) {
      return { avgFrameTime: 0, maxFrameTime: 0, jankFrames: 0 };
    }
    return {
      avgFrameTime: this.samples.reduce((a, b) => a + b) / this.samples.length,
      maxFrameTime: Math.max(...this.samples),
      jankFrames: this.samples.filter(t => t > 50).length,
    };
  }
}
