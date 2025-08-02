export interface SearchOptions {
  maxResults?: number;
  priority?: 'low' | 'medium' | 'high';
}

export interface SearchSource {
  title: string;
  url: string;
  content: string;
}

export interface SearchResponse {
  results: SearchSource[];
  totalQueries: number;
  cacheHitRate: number;
}

export class EnhancedSearchService {
  private static instance: EnhancedSearchService;
  private apiKey: string;

  private constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  static getInstance(apiKey: string): EnhancedSearchService {
    if (!EnhancedSearchService.instance) {
      EnhancedSearchService.instance = new EnhancedSearchService(apiKey);
    }
    return EnhancedSearchService.instance;
  }

  async searchSingle(query: string, options: SearchOptions = {}): Promise<SearchResponse> {
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
      
      const results: SearchSource[] = data.results?.map((result: any) => ({
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

  async searchEnhanced(queries: string[], options: SearchOptions = {}): Promise<SearchResponse> {
    const allResults: SearchSource[] = [];
    let totalQueries = 0;

    for (const query of queries.slice(0, 10)) { // Limit to 10 queries to avoid rate limits
      const response = await this.searchSingle(query, { ...options, maxResults: 2 });
      allResults.push(...response.results);
      totalQueries += response.totalQueries;
      
      // Add delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Remove duplicates based on URL
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