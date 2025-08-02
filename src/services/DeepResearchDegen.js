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

export const SEARCH_PROMPT_TEMPLATE = `You are an expert blockchain analyst. Your job is to research a given crypto project and create a report based on the following structure:
${REPORT_STRUCTURE.map((section, index) => `${index + 1}. ${section}`).join('\n')}

Your report should be comprehensive, clear, and concise. Use markdown formatting.
`;

export const OPENAI_DEFAULT_PARAMS = {
  model: "gpt-4.1-2025-04-14",
  max_tokens: 4096,
  temperature: 0.7,
};

export const ENHANCED_SEARCH_STRATEGY = {
  base: 8,
  deep: 12, 
  final: 6
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
  }

  async searchWeb(query, maxResults = 15) {
    const searchResults = await this.searchService.searchSingle(query, { maxResults });
    return searchResults.results;
  }

  async generateAIReport(input, sources) {
    const projectInfo = `
Project Name: ${input.projectName}
Website: ${input.website || 'Not provided'}
Twitter: ${input.twitter || 'Not provided'}
Contract Address: ${input.contractAddress || 'Not provided'}
    `.trim();

    const sourcesText = sources.map((source, index) => 
      `Source ${index + 1}: ${source.title}\nURL: ${source.url}\nContent: ${source.content.substring(0, 2000)}...\n\n`
    ).join('');

    const prompt = `${SEARCH_PROMPT_TEMPLATE}

${projectInfo}

Based on the following sources, create a comprehensive research report:

${sourcesText}

Please structure your response according to the report structure provided above. Be thorough and analytical.`;

    const response = await this.openai.chat.completions.create({
      ...OPENAI_DEFAULT_PARAMS,
      messages: [{ role: "user", content: prompt }]
    });

    return response.choices[0].message.content;
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
    return sources.filter(source => {
      if (seen.has(source.url)) {
        return false;
      }
      seen.add(source.url);
      return true;
    });
  }

  async fetchSourcesMultiStage(input) {
    const baseTerms = [
      input.projectName,
      `${input.projectName} crypto`,
      `${input.projectName} token`
    ];

    if (input.website) {
      baseTerms.push(`site:${input.website.replace(/^https?:\/\//, '')}`);
    }

    const allSources = [];

    // Stage 1: Base queries
    const baseQueries = this.expandQueries(baseTerms, 2);
    const stage1Results = await this.searchService.searchEnhanced(
      baseQueries.slice(0, ENHANCED_SEARCH_STRATEGY.base),
      { maxResults: 3 }
    );
    allSources.push(...stage1Results.results);

    // Stage 2: Deep queries  
    const deepQueries = this.expandQueries([
      `${input.projectName} team founders`,
      `${input.projectName} tokenomics`,
      `${input.projectName} roadmap`
    ], 2);
    const stage2Results = await this.searchService.searchEnhanced(
      deepQueries.slice(0, ENHANCED_SEARCH_STRATEGY.deep),
      { maxResults: 2 }
    );
    allSources.push(...stage2Results.results);

    // Stage 3: Final targeted queries
    const finalQueries = [
      `${input.projectName} price analysis`,
      `${input.projectName} community social`,
      `${input.projectName} smart contract`
    ];
    const stage3Results = await this.searchService.searchEnhanced(
      finalQueries.slice(0, ENHANCED_SEARCH_STRATEGY.final),
      { maxResults: 2 }
    );
    allSources.push(...stage3Results.results);

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

      // Pipeline execution for enhanced analysis
      const pipelineResults = await this.pipelineService.executePipeline(
        { sources },
        { mode: 'comprehensive', strictMode: false, highDepthMode: true }
      );

      // Generate main report
      const report = await this.generateAIReport(input, sources);

      // Calculate metrics
      const endTime = Date.now();
      const confidenceScore = this.calculateConfidenceScore(pipelineResults.results, {
        detailScore: this.calculateDetailScore(sources),
        sourceVariety: this.calculateSourceVariety(sources),
        topicCoverage: this.calculateTopicCoverage(sources)
      });

      const researchReport = {
        report,
        sources: sources.slice(0, 20), // Limit sources in response
        requestId,
        confidenceScore,
        metadata: {
          createdAt: Date.now(),
          requestId,
          sourcesFound: sources.length,
          wordCount: report.split(' ').length,
          detailScore: this.calculateDetailScore(sources),
          sourceVariety: this.calculateSourceVariety(sources),
          topicCoverage: this.calculateTopicCoverage(sources),
          duration: endTime - startTime,
          searchQueries: pipelineResults.metadata.totalQueries || 0,
          pipelineStages: pipelineResults.metadata.stagesProcessed || 0
        }
      };

      // Track analytics
      this.analytics.trackSearch({
        query: input.projectName,
        resultsCount: sources.length,
        duration: endTime - startTime
      });

      return researchReport;

    } catch (error) {
      console.error('Research generation failed:', error);
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

  generateRequestId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
}