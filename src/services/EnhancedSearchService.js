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

  validateQuery(query) {
    if (!query || typeof query !== 'string') {
      return false;
    }
    
    const sanitized = query.trim();
    return sanitized.length > 0 && sanitized.length <= 1000;
  }

  sanitizeQuery(query) {
    if (!query) return '';
    
    return query
      .trim()
      .replace(/[^\w\s\-_.@#]/g, ' ')
      .replace(/\s+/g, ' ')
      .substring(0, 1000);
  }

  async testConnection() {
    try {
      console.log('[TAVILY] Testing API connectivity...');
      console.log('[TAVILY] API Key exists:', !!this.apiKey);
      
      const testPayload = {
        api_key: this.apiKey,
        query: 'test',
        search_depth: 'basic',
        max_results: 1
      };
      
      console.log('[TAVILY] Test payload:', JSON.stringify(testPayload, null, 2));
      
      const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testPayload),
      });
      
      const responseText = await response.text();
      console.log('[TAVILY] Test response status:', response.status);
      console.log('[TAVILY] Test response body:', responseText);
      
      return response.ok;
    } catch (error) {
      console.error('[TAVILY] Connection test failed:', error);
      return false;
    }
  }

  async searchSingle(query, options = {}) {
    const { maxResults = 5, useFallback = true } = options;
    
    // Validate and sanitize query
    if (!this.validateQuery(query)) {
      console.warn('[TAVILY] Invalid query:', query);
      return {
        results: [],
        totalQueries: 1,
        cacheHitRate: 0
      };
    }

    const sanitizedQuery = this.sanitizeQuery(query);
    console.log('[TAVILY] Searching:', sanitizedQuery);

    // Try advanced search first
    let searchResult = await this.attemptSearch(sanitizedQuery, maxResults, 'advanced', true);
    
    // Fallback strategies if advanced search fails
    if (useFallback && searchResult.results.length === 0) {
      console.log('[TAVILY] Advanced search failed, trying fallbacks...');
      
      // Try without domain filtering
      searchResult = await this.attemptSearch(sanitizedQuery, maxResults, 'advanced', false);
      
      // Try basic search
      if (searchResult.results.length === 0) {
        searchResult = await this.attemptSearch(sanitizedQuery, maxResults, 'basic', false);
      }
    }

    return searchResult;
  }

  async attemptSearch(query, maxResults, searchDepth, useDomainFiltering) {
    try {
      const payload = {
        api_key: this.apiKey,
        query,
        search_depth: searchDepth,
        include_answer: false,
        include_images: false,
        include_raw_content: true,
        max_results: maxResults
      };

      // Only add domain filtering if requested and for crypto-related queries
      if (useDomainFiltering && this.isCryptoQuery(query)) {
        payload.include_domains = [
          'cointelegraph.com',
          'coindesk.com',
          'coingecko.com',
          'coinmarketcap.com'
        ];
      }

      console.log('[TAVILY] Request payload:', JSON.stringify(payload, null, 2));

      const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[TAVILY] API error:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        throw new Error(`Tavily API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('[TAVILY] Search successful, results:', data.results?.length || 0);
      
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
      console.error('[TAVILY] Search failed:', error.message);
      return {
        results: [],
        totalQueries: 1,
        cacheHitRate: 0
      };
    }
  }

  isCryptoQuery(query) {
    const cryptoKeywords = ['crypto', 'cryptocurrency', 'bitcoin', 'ethereum', 'token', 'defi', 'blockchain', 'coin'];
    const lowerQuery = query.toLowerCase();
    return cryptoKeywords.some(keyword => lowerQuery.includes(keyword));
  }

  async searchEnhanced(queries, options = {}) {
    console.log('[TAVILY] Enhanced search starting with', queries.length, 'queries');
    
    // Test connection first
    const connectionOk = await this.testConnection();
    if (!connectionOk) {
      console.error('[TAVILY] Connection test failed, aborting search');
      return {
        results: [],
        totalQueries: 0,
        cacheHitRate: 0
      };
    }

    const allResults = [];
    let totalQueries = 0;
    let successfulQueries = 0;

    // Limit queries and add validation
    const validQueries = queries
      .slice(0, 10)
      .filter(query => this.validateQuery(query))
      .map(query => this.sanitizeQuery(query));

    console.log('[TAVILY] Processing', validQueries.length, 'valid queries');

    for (const query of validQueries) {
      const response = await this.searchSingle(query, { ...options, maxResults: 2 });
      
      if (response.results.length > 0) {
        allResults.push(...response.results);
        successfulQueries++;
      }
      
      totalQueries += response.totalQueries;
      
      // Adaptive delay based on success rate
      const delay = successfulQueries > 0 ? 1000 : 2000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    // Remove duplicates
    const uniqueResults = allResults.filter((result, index, self) => 
      index === self.findIndex(r => r.url === result.url)
    );

    console.log('[TAVILY] Enhanced search completed:', {
      totalQueries,
      successfulQueries,
      uniqueResults: uniqueResults.length
    });

    return {
      results: uniqueResults,
      totalQueries,
      cacheHitRate: 0
    };
  }
}