import OpenAI from "openai";
import { EnhancedSearchService } from "./EnhancedSearchService.js";
import { CostTracker } from "./CostTracker.js";
import { SearchAnalytics } from "./SearchAnalytics.js";
import { PipelineService } from "./PipelineService.js";

export const REPORT_STRUCTURE = [
  "TLDR",
  "Project Information & Competition",
  "Team, Venture Funds, CEO and Key Members",
  "Tokenomics",
  "Airdrops and Incentive Programs",
  "Social Media & Community Analysis",
  "On-Chain Overview",
  "Conclusion"
];

export const SEARCH_PROMPT_TEMPLATE = `You are a world-class blockchain analyst with deep expertise in DeFi, tokenomics, and crypto market dynamics. 

Analyze the provided sources with extreme attention to detail and create a comprehensive research report. Focus on:
- **Critical analysis** over generic descriptions  
- **Specific data points** and metrics where available
- **Red flags** and risk factors
- **Competitive positioning** and market context
- **Technical implementation** details
- **Community sentiment** and social signals

Structure your analysis exactly as follows:
${REPORT_STRUCTURE.map((section, index) => `${index + 1}. ${section}`).join('\n')}

**Requirements:**
- Minimum 2000 words total
- Each section should contain specific, actionable insights
- Include quantitative data wherever possible  
- Provide critical analysis, not just project marketing
- Flag any concerning patterns or red flags
- Use professional markdown formatting with clear headers

Make this report valuable to sophisticated crypto investors.`;

export const OPENAI_DEFAULT_PARAMS = {
  model: "gpt-4.1-2025-04-14",
  max_tokens: 8192,
  temperature: 0.3,
};

export const ENHANCED_SEARCH_STRATEGY = {
  base: 15,
  deep: 20, 
  final: 15,
  targeted: 10
};

export class DeepResearchDegen {
  constructor(openaiKey, tavilyKey) {
    this.openai = new OpenAI({ 
      apiKey: openaiKey,
      dangerouslyAllowBrowser: false
    });
    this.searchService = EnhancedSearchService.getInstance(tavilyKey);
    this.pipelineService = new PipelineService(openaiKey);
    this.costTracker = CostTracker.getInstance();
    this.analytics = SearchAnalytics.getInstance();
    this.debugLogs = [];
  }

  async searchWeb(query, maxResults = 15) {
    const startTime = Date.now();
    try {
      const searchResults = await this.searchService.searchSingle(query, { maxResults });
      const duration = Date.now() - startTime;
      
      // Debug logging for search performance
      this.logDebug('search_performance', {
        query,
        resultsCount: searchResults.results?.length || 0,
        duration,
        quality: this.calculateSearchResultQuality(searchResults.results || [])
      });
      
      return searchResults.results;
    } catch (error) {
      console.error('Search failed:', error);
      this.logDebug('search_error', { query, error: error.message });
      return [];
    }
  }

  async generateAIReport(input, sources, pipelineResults = null) {
    const startTime = Date.now();
    const projectInfo = `
Project Name: ${input.projectName}
Website: ${input.website || 'Not provided'}
Twitter: ${input.twitter || 'Not provided'}
Contract Address: ${input.contractAddress || 'Not provided'}
    `.trim();

    // Enhanced source processing with quality scoring
    const processedSources = this.processAndScoreSources(sources);
    const topSources = processedSources.slice(0, 25); // Increased from 20
    
    const sourcesText = topSources.map((source, index) => 
      `Source ${index + 1}: ${source.title}\nURL: ${source.url}\nQuality Score: ${source.qualityScore}\nContent: ${source.content.substring(0, 8000)}${source.content.length > 8000 ? '...' : ''}\n\n`
    ).join('');

    // Include pipeline results for cross-referencing
    const pipelineInfo = pipelineResults ? `
    
Pipeline Analysis Results:
${pipelineResults.results.map(r => `Stage ${r.stage}: ${r.output.substring(0, 500)}...`).join('\n')}
    ` : '';

    const prompt = `${SEARCH_PROMPT_TEMPLATE}

${projectInfo}

Based on the following sources, create a comprehensive research report:

${sourcesText}

${pipelineInfo}

Please structure your response according to the report structure provided above. Be thorough and analytical. Cross-reference information between sources for accuracy. Minimum 2000 words.`;

    const response = await this.openai.chat.completions.create({
      ...OPENAI_DEFAULT_PARAMS,
      messages: [{ role: "user", content: prompt }]
    });

    const result = response.choices[0].message.content;
    const duration = Date.now() - startTime;
    
    // Debug logging for AI generation
    this.logDebug('ai_generation', {
      tokensUsed: response.usage?.total_tokens || 0,
      duration,
      sourcesUsed: topSources.length,
      reportLength: result.length,
      averageSourceQuality: topSources.reduce((sum, s) => sum + s.qualityScore, 0) / topSources.length
    });

    return result;
  }

  expandQueries(baseTerms, variationCount = 3) {
    const variations = [];
    const suffixes = [
      "crypto token analysis",
      "blockchain project review", 
      "tokenomics breakdown",
      "team funding investors",
      "price prediction analysis",
      "community social media",
      "smart contract audit",
      "roadmap development"
    ];

    baseTerms.forEach(term => {
      variations.push(term);
      for (let i = 0; i < variationCount && i < suffixes.length; i++) {
        variations.push(`${term} ${suffixes[i]}`);
      }
    });

    return variations;
  }

  deduplicateSources(sources) {
    const seen = new Set();
    const titleSimilarity = new Map();
    
    return sources.filter(source => {
      // URL-based deduplication
      const normalizedUrl = source.url.toLowerCase().replace(/\/$/, '');
      if (seen.has(normalizedUrl)) return false;
      seen.add(normalizedUrl);
      
      // Content similarity deduplication (basic)
      const titleWords = source.title.toLowerCase().split(' ').slice(0, 5).join(' ');
      if (titleSimilarity.has(titleWords)) {
        const existing = titleSimilarity.get(titleWords);
        // Keep the source with more content
        if (source.content.length <= existing.content.length) return false;
        titleSimilarity.set(titleWords, source);
        return true;
      }
      titleSimilarity.set(titleWords, source);
      return true;
    });
  }

  async fetchSourcesMultiStage(input) {
    let stageMetrics = [];
    const allSources = [];
    
    // Stage 1: Base discovery queries (increased delay)
    const stageStartTime = Date.now();
    const baseTerms = [
      input.projectName,
      `${input.projectName} crypto`,
      `${input.projectName} token`,
      `${input.projectName} blockchain`
    ];

    if (input.website) {
      baseTerms.push(`site:${input.website.replace(/^https?:\/\//, '')}`);
    }
    if (input.twitter) {
      baseTerms.push(`site:twitter.com ${input.projectName}`);
    }

    const baseQueries = this.expandQueries(baseTerms, 3);
    const stage1Results = await this.searchService.searchEnhanced(
      baseQueries.slice(0, ENHANCED_SEARCH_STRATEGY.base),
      { maxResults: 4 }
    );
    allSources.push(...stage1Results.results);
    
    stageMetrics.push({
      stage: 'base',
      queries: baseQueries.slice(0, ENHANCED_SEARCH_STRATEGY.base).length,
      sources: stage1Results.results.length,
      duration: Date.now() - stageStartTime
    });

    // Stage 2: Deep analysis queries  
    const stage2Start = Date.now();
    const deepQueries = this.expandQueries([
      `${input.projectName} team founders CEO`,
      `${input.projectName} tokenomics supply distribution`,
      `${input.projectName} roadmap development milestones`,
      `${input.projectName} partnerships investors funding`,
      `${input.projectName} use case utility value proposition`,
      `${input.projectName} competition comparison analysis`
    ], 3);
    const stage2Results = await this.searchService.searchEnhanced(
      deepQueries.slice(0, ENHANCED_SEARCH_STRATEGY.deep),
      { maxResults: 3 }
    );
    allSources.push(...stage2Results.results);
    
    stageMetrics.push({
      stage: 'deep',
      queries: deepQueries.slice(0, ENHANCED_SEARCH_STRATEGY.deep).length,
      sources: stage2Results.results.length,
      duration: Date.now() - stage2Start
    });

    // Stage 3: Market & community queries
    const stage3Start = Date.now();
    const marketQueries = this.expandQueries([
      `${input.projectName} price prediction market cap`,
      `${input.projectName} community social telegram discord`,
      `${input.projectName} smart contract security audit`,
      `${input.projectName} airdrop rewards incentives`,
      `${input.projectName} listing exchange trading volume`
    ], 2);
    const stage3Results = await this.searchService.searchEnhanced(
      marketQueries.slice(0, ENHANCED_SEARCH_STRATEGY.final),
      { maxResults: 3 }
    );
    allSources.push(...stage3Results.results);
    
    stageMetrics.push({
      stage: 'market',
      queries: marketQueries.slice(0, ENHANCED_SEARCH_STRATEGY.final).length,
      sources: stage3Results.results.length,
      duration: Date.now() - stage3Start
    });

    // Stage 4: Targeted risk & technical queries
    const stage4Start = Date.now();
    const riskQueries = [
      `${input.projectName} risks concerns red flags`,
      `${input.projectName} technical implementation architecture`,
      `${input.projectName} regulatory compliance legal`,
      `${input.projectName} news updates recent developments`,
      `"${input.projectName}" review analysis report`
    ];
    const stage4Results = await this.searchService.searchEnhanced(
      riskQueries.slice(0, ENHANCED_SEARCH_STRATEGY.targeted),
      { maxResults: 2 }
    );
    allSources.push(...stage4Results.results);
    
    stageMetrics.push({
      stage: 'risk',
      queries: riskQueries.slice(0, ENHANCED_SEARCH_STRATEGY.targeted).length,
      sources: stage4Results.results.length,
      duration: Date.now() - stage4Start
    });

    // Log stage performance
    this.logDebug('multi_stage_search', {
      totalSources: allSources.length,
      stageMetrics,
      totalQueries: stageMetrics.reduce((sum, s) => sum + s.queries, 0)
    });

    return this.deduplicateSources(allSources);
  }

  calculateDetailScore(sources) {
    if (sources.length === 0) return 0;
    const avgLength = sources.reduce((sum, s) => sum + s.content.length, 0) / sources.length;
    return Math.min(100, (avgLength / 500) * 100);
  }

  calculateSourceVariety(sources) {
    const domains = new Set(sources.map(s => {
      try {
        return new URL(s.url).hostname;
      } catch {
        return 'unknown';
      }
    }));
    return Math.min(100, (domains.size / sources.length) * 100);
  }

  calculateTopicCoverage(sources) {
    const topics = ['tokenomics', 'team', 'roadmap', 'community', 'price', 'technical'];
    const covered = topics.filter(topic => 
      sources.some(s => s.content.toLowerCase().includes(topic))
    );
    return covered;
  }

  async generateReport(input) {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    // Check cost constraints
    const estimatedCost = 50;
    if (!this.costTracker.canAffordOperation(estimatedCost)) {
      throw new Error('Daily budget exceeded');
    }

    try {
      // Multi-stage source fetching
      const sources = await this.fetchSourcesMultiStage(input);
      
      if (sources.length === 0) {
        throw new Error('No sources found for the project');
      }

      // Quality threshold check - trigger additional searches if needed
      const initialQuality = this.calculateSearchQuality({
        detailScore: this.calculateDetailScore(sources),
        sourceVariety: this.calculateSourceVariety(sources),
        topicCoverage: this.calculateTopicCoverage(sources)
      });
      
      this.logDebug('initial_quality_check', {
        quality: initialQuality,
        sourcesCount: sources.length,
        threshold: 70
      });
      
      // If quality is below threshold, perform additional targeted searches
      let finalSources = sources;
      if (initialQuality < 70) {
        this.logDebug('quality_enhancement', { trigger: 'low_initial_quality' });
        const additionalQueries = [
          `${input.projectName} detailed analysis report`,
          `${input.projectName} comprehensive review`,
          `${input.projectName} expert opinion analysis`
        ];
        
        for (const query of additionalQueries) {
          const additionalResults = await this.searchWeb(query, 5);
          finalSources.push(...additionalResults);
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
        
        finalSources = this.deduplicateSources(finalSources);
      }

      // Pipeline execution for enhanced analysis
      const pipelineResults = await this.pipelineService.executePipeline(
        { sources: finalSources },
        { mode: 'comprehensive', strictMode: false, highDepthMode: true }
      );

      // Generate main report with pipeline cross-referencing
      const report = await this.generateAIReport(input, finalSources, pipelineResults);

      // Calculate final metrics
      const endTime = Date.now();
      const finalQuality = this.calculateSearchQuality({
        detailScore: this.calculateDetailScore(finalSources),
        sourceVariety: this.calculateSourceVariety(finalSources),
        topicCoverage: this.calculateTopicCoverage(finalSources)
      });
      
      const confidenceScore = this.calculateConfidenceScore(pipelineResults.results, {
        detailScore: this.calculateDetailScore(finalSources),
        sourceVariety: this.calculateSourceVariety(finalSources),
        topicCoverage: this.calculateTopicCoverage(finalSources)
      });

      const totalDuration = endTime - startTime;

      // Final debug summary
      this.logDebug('research_complete', {
        requestId,
        totalDuration,
        finalSourcesCount: finalSources.length,
        finalQuality,
        confidenceScore,
        reportWordCount: report.split(' ').length,
        debugLogsCount: this.debugLogs.length
      });

      const researchReport = {
        report,
        sources: finalSources.slice(0, 25), // Increased from 20
        requestId,
        confidenceScore,
        metadata: {
          createdAt: Date.now(),
          requestId,
          sourcesFound: finalSources.length,
          wordCount: report.split(' ').length,
          detailScore: this.calculateDetailScore(finalSources),
          sourceVariety: this.calculateSourceVariety(finalSources),
          topicCoverage: this.calculateTopicCoverage(finalSources),
          duration: totalDuration,
          searchQueries: pipelineResults.metadata.totalQueries || 0,
          pipelineStages: pipelineResults.metadata.stagesProcessed || 0,
          debugLogs: this.debugLogs,
          qualityEnhanced: finalSources.length > sources.length,
          searchQuality: finalQuality
        }
      };

      // Track analytics
      this.analytics.trackSearch({
        query: input.projectName,
        resultsCount: finalSources.length,
        duration: totalDuration
      });

      return researchReport;

    } catch (error) {
      console.error('Research generation failed:', error);
      this.logDebug('research_error', { error: error.message, requestId });
      throw error;
    }
  }

  calculateConfidenceScore(pipelineResults, searchResults) {
    const pipelineScore = pipelineResults.length > 0 ? 80 : 40;
    const searchQuality = this.calculateSearchQuality(searchResults);
    return Math.round((pipelineScore + searchQuality) / 2);
  }

  calculateSearchQuality(searchResults) {
    const { detailScore, sourceVariety, topicCoverage } = searchResults;
    const topicScore = (topicCoverage.length / 6) * 100;
    return Math.round((detailScore + sourceVariety + topicScore) / 3);
  }

  // Enhanced helper methods for improved functionality
  processAndScoreSources(sources) {
    return sources.map(source => ({
      ...source,
      qualityScore: this.calculateSourceQualityScore(source),
      cleanedContent: this.cleanContent(source.content)
    })).sort((a, b) => b.qualityScore - a.qualityScore);
  }
  
  calculateSourceQualityScore(source) {
    let score = 0;
    
    // Content length (up to 40 points)
    score += Math.min(source.content.length / 100, 40);
    
    // Title relevance (up to 20 points)
    const titleWords = source.title.toLowerCase();
    if (titleWords.includes('analysis') || titleWords.includes('review')) score += 10;
    if (titleWords.includes('report') || titleWords.includes('research')) score += 10;
    
    // Domain authority (up to 20 points)
    const domain = source.url.toLowerCase();
    if (domain.includes('cointelegraph') || domain.includes('coindesk')) score += 15;
    if (domain.includes('medium') || domain.includes('substack')) score += 10;
    if (domain.includes('github') || domain.includes('docs.')) score += 12;
    
    // Content quality indicators (up to 20 points)
    const content = source.content.toLowerCase();
    if (content.includes('tokenomics')) score += 5;
    if (content.includes('whitepaper')) score += 5;
    if (content.includes('audit')) score += 5;
    if (content.includes('roadmap')) score += 5;
    
    return Math.min(score, 100);
  }
  
  cleanContent(content) {
    return content
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s.,!?;:-]/g, '')
      .trim();
  }
  
  calculateSearchResultQuality(results) {
    if (!results.length) return 0;
    const avgLength = results.reduce((sum, r) => sum + r.content.length, 0) / results.length;
    const uniqueDomains = new Set(results.map(r => {
      try {
        return new URL(r.url).hostname;
      } catch {
        return 'unknown';
      }
    })).size;
    return Math.min(avgLength / 100 + uniqueDomains * 5, 100);
  }
  
  logDebug(event, data) {
    const logEntry = {
      timestamp: Date.now(),
      event,
      data
    };
    this.debugLogs.push(logEntry);
    console.log(`[DEBUG ${event}]:`, data);
  }

  generateRequestId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
}