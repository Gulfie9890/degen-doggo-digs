export class SearchAnalytics {
  static instance;
  
  constructor() {
    this.searches = [];
  }

  static getInstance() {
    if (!SearchAnalytics.instance) {
      SearchAnalytics.instance = new SearchAnalytics();
    }
    return SearchAnalytics.instance;
  }

  trackSearch(searchData) {
    this.searches.push({
      ...searchData,
      timestamp: Date.now()
    });
  }

  getAnalytics() {
    return {
      totalSearches: this.searches.length,
      averageDuration: this.searches.reduce((sum, s) => sum + s.duration, 0) / this.searches.length,
      totalResults: this.searches.reduce((sum, s) => sum + s.resultsCount, 0)
    };
  }
}