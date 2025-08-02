export class CostTracker {
  private static instance: CostTracker;
  private dailyBudget = 10.0; // $10 daily budget
  private currentSpend = 0;

  private constructor() {}

  static getInstance(): CostTracker {
    if (!CostTracker.instance) {
      CostTracker.instance = new CostTracker();
    }
    return CostTracker.instance;
  }

  canAffordOperation(estimatedCost: number): boolean {
    const estimatedTotalCost = estimatedCost * 0.001; // $0.001 per search
    return (this.currentSpend + estimatedTotalCost) <= this.dailyBudget;
  }

  trackCost(cost: number): void {
    this.currentSpend += cost;
  }

  getRemainingBudget(): number {
    return Math.max(0, this.dailyBudget - this.currentSpend);
  }

  reset(): void {
    this.currentSpend = 0;
  }
}