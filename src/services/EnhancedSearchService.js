export class EnhancedSearchService {
  static instance;
  
  constructor(apiKey) {
    this.apiKey = apiKey;
  }

  static getInstance(apiKey) {
    if (!EnhancedSearchService.instance) {
      EnhancedSearchService.instance = new EnhancedSearchService(apiKey);
    }
    return EnhancedSearchService.instance;
  }

  async searchSingle(query, options = {}) {
    const { maxResults = 5 } = options;
    
    try {
      const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: this.apiKey,
          query,
          search_depth: 'advanced',
          include_answer: false,
          include_images: false,
          include_raw_content: true,
          max_results: maxResults,
          include_domains: [],
          exclude_domains: []
        }),
      });

      if (!response.ok) {
        throw new Error(`Tavily API error: ${response.status}`);
      }

      const data = await response.json();
      
      const results = data.results?.map((result) => ({
        title: result.title || 'No Title',
        url: result.url || '',
        content: result.raw_content || result.content || ''
      })) || [];

      return {
        results,
        totalQueries: 1,
        cacheHitRate: 0
      };
    } catch (error) {
      console.error('Search failed:', error);
      return {
        results: [],
        totalQueries: 1,
        cacheHitRate: 0
      };
    }
  }

  async searchEnhanced(queries, options = {}) {
    const allResults = [];
    let totalQueries = 0;

    for (const query of queries.slice(0, 10)) {
      const response = await this.searchSingle(query, { ...options, maxResults: 2 });
      allResults.push(...response.results);
      totalQueries += response.totalQueries;
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const uniqueResults = allResults.filter((result, index, self) => 
      index === self.findIndex(r => r.url === result.url)
    );

    return {
      results: uniqueResults,
      totalQueries,
      cacheHitRate: 0
    };
  }
}