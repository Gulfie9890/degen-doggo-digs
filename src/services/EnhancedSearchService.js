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

      // Instead of restricting to only these domains, boost preferred sources
      if (useDomainFiltering && this.isCryptoQuery(query)) {
        // Enhance query to boost preferred crypto sources without restricting others
        payload.query = `${query} (site:twitter.com OR site:medium.com OR site:github.com OR site:coingecko.com OR site:coinmarketcap.com OR site:coindesk.com OR site:cointelegraph.com)`;
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

    // Increase query limit and configurability
    const queryLimit = options.queryLimit || 25;
    const maxResultsPerQuery = options.maxResults || 5;
    
    const validQueries = queries
      .slice(0, queryLimit)
      .filter(query => this.validateQuery(query))
      .map(query => this.sanitizeQuery(query));

    console.log('[TAVILY] Processing', validQueries.length, 'valid queries (limit:', queryLimit, ')');
    console.log('[DEBUG] Query variety:', this.analyzeQueryDiversity(validQueries));

    for (const query of validQueries) {
      const response = await this.searchSingle(query, { ...options, maxResults: maxResultsPerQuery });
      
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

  analyzeQueryDiversity(queries) {
    const uniqueWords = new Set();
    const siteQueries = queries.filter(q => q.includes('site:')).length;
    const technicalTerms = ['whitepaper', 'tokenomics', 'audit', 'technical', 'documentation'].filter(term => 
      queries.some(q => q.toLowerCase().includes(term))
    ).length;
    
    queries.forEach(query => {
      query.toLowerCase().split(' ').forEach(word => uniqueWords.add(word));
    });
    
    return {
      totalQueries: queries.length,
      uniqueWords: uniqueWords.size,
      siteSpecificQueries: siteQueries,
      technicalQueries: technicalTerms,
      diversityScore: Math.round((uniqueWords.size / (queries.length * 3)) * 100)
    };
  }
}