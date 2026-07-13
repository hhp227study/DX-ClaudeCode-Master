/** 최근 N개 샘플의 이동 평균 */
export class RollingAvg {
  private values: number[] = [];

  constructor(private readonly size = 30) {}

  push(v: number): void {
    this.values.push(v);
    if (this.values.length > this.size) this.values.shift();
  }

  get avg(): number {
    if (this.values.length === 0) return 0;
    return this.values.reduce((a, b) => a + b, 0) / this.values.length;
  }
}

/** rAF 루프 fps 계측기 */
export class FpsMeter {
  private last = 0;
  private readonly interval = new RollingAvg(30);

  tick(now: number): void {
    if (this.last > 0) this.interval.push(now - this.last);
    this.last = now;
  }

  get fps(): number {
    const ms = this.interval.avg;
    return ms > 0 ? 1000 / ms : 0;
  }
}
