export class CostTracker {
  static instance;
  
  constructor() {
    this.dailyBudget = 10.0;
    this.currentSpend = 0;
  }

  static getInstance() {
    if (!CostTracker.instance) {
      CostTracker.instance = new CostTracker();
    }
    return CostTracker.instance;
  }

  canAffordOperation(estimatedCost) {
    const estimatedTotalCost = estimatedCost * 0.001;
    return (this.currentSpend + estimatedTotalCost) <= this.dailyBudget;
  }

  trackCost(cost) {
    this.currentSpend += cost;
  }

  getRemainingBudget() {
    return Math.max(0, this.dailyBudget - this.currentSpend);
  }

  reset() {
    this.currentSpend = 0;
  }
}