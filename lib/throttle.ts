/**
 * Batches stroke-extend events at ~33ms (30fps) to keep broadcast traffic low.
 */
export class Throttle {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private pending: (() => void) | null = null;

  constructor(private ms: number) {}

  schedule(fn: () => void) {
    this.pending = fn;
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      const p = this.pending;
      this.pending = null;
      p?.();
    }, this.ms);
  }

  cancel() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.pending = null;
  }
}