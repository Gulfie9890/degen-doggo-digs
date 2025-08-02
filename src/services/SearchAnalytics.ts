export interface AnalyticsData {
  requestId: string;
  timestamp: number;
  queryCount: number;
  resultsCount: number;
  duration: number;
  success: boolean;
}

export class SearchAnalytics {
  private static instance: SearchAnalytics;
  private analytics: AnalyticsData[] = [];

  private constructor() {}

  static getInstance(): SearchAnalytics {
    if (!SearchAnalytics.instance) {
      SearchAnalytics.instance = new SearchAnalytics();
    }
    return SearchAnalytics.instance;
  }

  track(data: AnalyticsData): void {
    this.analytics.push(data);
    
    // Keep only last 100 records to prevent memory issues
    if (this.analytics.length > 100) {
      this.analytics = this.analytics.slice(-100);
    }
  }

  getStats() {
    const totalRequests = this.analytics.length;
    const successfulRequests = this.analytics.filter(a => a.success).length;
    const avgDuration = this.analytics.reduce((sum, a) => sum + a.duration, 0) / totalRequests || 0;
    
    return {
      totalRequests,
      successRate: totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0,
      avgDuration: Math.round(avgDuration)
    };
  }
}
