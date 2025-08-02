import OpenAI from "openai";
import { EnhancedSearchService } from "./EnhancedSearchService";
import { CostTracker } from "./CostTracker";
import { SearchAnalytics } from "./SearchAnalytics";
import { PipelineService, PipelineOptions } from "./PipelineService";

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

export type ProjectInput = {
  project_name: string;
  project_website: string;
  project_twitter: string;
  project_contract?: string;
};

export type SearchSource = {
  title: string;
  url: string;
  content: string;
};

export type ResearchReport = {
  report: string;
  sources: SearchSource[];
  requestId: string;
  confidenceScore: number;
  metadata: {
    createdAt: number;
    requestId: string;
    wordCount: number;
    queryTerms: string[];
    retries: number;
    durationMs: number;
    confidenceReason?: string;
    speculativeDensity?: number;
    sectionCoverageScore?: number;
    totalSearchCost?: number;
    cacheHitRate?: number;
    searchQualityScore?: number;
    detailScore?: number;        // How comprehensive the coverage is
    sourceVariety?: number;      // Diversity of source types
    analysisDepth?: number;      // Level of analytical thinking
    topicCoverage?: string[];    // Which aspects were covered
    businessMetrics?: {
      costPerQuery: number;
      rateLimitStatus: string;
      performanceGrade: string;
    };
    pipelineMetadata?: {
      modelUsed: string[];
      processingStages: string[];
      bottlenecks: string[];
      qualityGates: { stage: string; passed: boolean; reason: string }[];
      totalTokensUsed: number;
      totalDuration: number;
      performanceGrade: string;
    };
  };
  jsonSections?: Record<string, string>;
};

export const ENHANCED_SEARCH_STRATEGY = {
  // Stage 1: Broad discovery (25 searches)
  initialQueries: 25,
  
  // Stage 2: Gap-filling (25 searches) 
  focusedQueries: 25,
  
  // Stage 3: Deep validation (25 searches)
  validationQueries: 25,
  
  // Stage 4: Real-time updates (25 searches)
  recentQueries: 25,
  
  total: 100
};

export class DeepResearchDegen {
  private openaiApiKey: string;
  private tavilyApiKey: string;
  private modelName: string;
  private searchService: EnhancedSearchService;
  private pipelineService: PipelineService;

  constructor(openaiApiKey: string, tavilyApiKey: string, modelName = "gpt-4.1-2025-04-14") {
    this.openaiApiKey = openaiApiKey;
    this.tavilyApiKey = tavilyApiKey;
    this.modelName = modelName;
    this.searchService = EnhancedSearchService.getInstance(tavilyApiKey);
    this.pipelineService = new PipelineService(openaiApiKey);
  }

  private async searchWeb(query: string, maxResults: number = 15): Promise<SearchSource[]> {
    try {
      const response = await this.searchService.searchSingle(query, {
        maxResults,
        priority: 'high',
      });
      return response.results;
    } catch (error) {
      console.error('Enhanced web search failed:', error);
      return [];
    }
  }

  private async generateAIReport(
    input: ProjectInput,
    sources: SearchSource[]
  ): Promise<string> {
    const openai = new OpenAI({ apiKey: this.openaiApiKey, dangerouslyAllowBrowser: true });

    const systemPrompt = `${SEARCH_PROMPT_TEMPLATE}
Project Name: ${input.project_name}
Project Website: ${input.project_website}
Project Twitter: ${input.project_twitter}
`;

    const content = sources
      .map(source => `Source: ${source.title}\nURL: ${source.url}\nContent: ${source.content}`)
      .join('\n---\n');

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Please create a report based on the following sources:\n${content}` },
    ];

    const completion = await openai.chat.completions.create({
      ...OPENAI_DEFAULT_PARAMS,
      messages,
    });

    const report = completion.choices[0]?.message?.content;
    if (!report) {
      throw new Error("No report generated");
    }
    return report;
  }

  private expandQueries(baseTerms: string[], variationCount: number = 3): string[] {
    const expansions: string[] = [];
    
    baseTerms.forEach(term => {
      // Add synonyms and related terms
      const variations = [
        term.replace('crypto', 'cryptocurrency'),
        term.replace('blockchain', 'distributed ledger'),
        term.replace('tokenomics', 'token economics'),
        term.replace('DeFi', 'decentralized finance'),
        `"${term}"`, // Exact phrase search
        `${term} review`,
        `${term} analysis 2024`,
        `${term} news latest`,
      ];
      expansions.push(...variations.slice(0, variationCount));
    });
    
    return [...baseTerms, ...expansions];
  }

  private deduplicateSources(sources: SearchSource[]): SearchSource[] {
    const seen = new Set<string>();
    return sources.filter(source => {
      const url = source.url.toLowerCase();
      if (seen.has(url)) return false;
      seen.add(url);
      return true;
    });
  }

  private async fetchSourcesMultiStage(input: ProjectInput): Promise<SearchSource[]> {
    const allSources: SearchSource[] = [];
    
    // Stage 1: Broad discovery (25 searches)
    const initialQueries = [
      `${input.project_name}`,
      `${input.project_name} crypto`,
      `${input.project_name} blockchain`,
      `${input.project_name} tokenomics`,
      `${input.project_name} team founders`,
    ];
    
    const expandedInitial = this.expandQueries(initialQueries, 5);
    const stage1Results = await this.searchService.searchEnhanced(
      expandedInitial.slice(0, ENHANCED_SEARCH_STRATEGY.initialQueries), 
      { maxResults: 50, priority: 'high' }
    );
    allSources.push(...stage1Results.results);

    // Stage 2: Gap-filling focused queries (25 searches)
    const focusedQueries = [
      `${input.project_name} venture capital funding`,
      `${input.project_name} whitepaper`,
      `${input.project_name} roadmap`,
      `${input.project_name} governance`,
      `${input.project_name} utility token`,
    ];
    
    const expandedFocused = this.expandQueries(focusedQueries, 5);
    const stage2Results = await this.searchService.searchEnhanced(
      expandedFocused.slice(0, ENHANCED_SEARCH_STRATEGY.focusedQueries),
      { maxResults: 50, priority: 'high' }
    );
    allSources.push(...stage2Results.results);

    // Stage 3: Deep validation (25 searches)
    const validationQueries = [
      `${input.project_name} audit`,
      `${input.project_name} security`,
      `${input.project_name} smart contract`,
      `${input.project_name} partnerships`,
      `${input.project_name} ecosystem`,
    ];
    
    const expandedValidation = this.expandQueries(validationQueries, 5);
    const stage3Results = await this.searchService.searchEnhanced(
      expandedValidation.slice(0, ENHANCED_SEARCH_STRATEGY.validationQueries),
      { maxResults: 50, priority: 'high' }
    );
    allSources.push(...stage3Results.results);

    // Stage 4: Real-time updates (25 searches)
    const recentQueries = [
      `${input.project_name} news 2024`,
      `${input.project_name} updates latest`,
      `${input.project_name} price prediction`,
      `${input.project_name} community sentiment`,
      `${input.project_name} social media`,
    ];
    
    const expandedRecent = this.expandQueries(recentQueries, 5);
    const stage4Results = await this.searchService.searchEnhanced(
      expandedRecent.slice(0, ENHANCED_SEARCH_STRATEGY.recentQueries),
      { maxResults: 50, priority: 'high' }
    );
    allSources.push(...stage4Results.results);

    return this.deduplicateSources(allSources);
  }

  private calculateDetailScore(sources: SearchSource[]): number {
    const totalContent = sources.reduce((sum, s) => sum + s.content.length, 0);
    const avgContentLength = totalContent / sources.length;
    return Math.min(avgContentLength / 2000, 1); // Normalize to 0-1
  }

  private calculateSourceVariety(sources: SearchSource[]): number {
    const domains = new Set(sources.map(s => {
      try {
        return new URL(s.url).hostname;
      } catch {
        return s.url;
      }
    }));
    return Math.min(domains.size / 20, 1); // Normalize to 0-1, expecting up to 20 unique domains
  }

  private calculateTopicCoverage(sources: SearchSource[]): string[] {
    const topics = new Set<string>();
    const content = sources.map(s => s.content.toLowerCase()).join(' ');
    
    const topicKeywords = {
      'tokenomics': ['token', 'supply', 'distribution', 'economics'],
      'team': ['founder', 'team', 'ceo', 'developer'],
      'funding': ['funding', 'investment', 'venture', 'capital'],
      'technology': ['blockchain', 'protocol', 'smart contract', 'audit'],
      'community': ['community', 'social', 'discord', 'telegram', 'twitter'],
      'partnerships': ['partner', 'collaboration', 'integration'],
      'roadmap': ['roadmap', 'milestone', 'future', 'development']
    };

    Object.entries(topicKeywords).forEach(([topic, keywords]) => {
      if (keywords.some(keyword => content.includes(keyword))) {
        topics.add(topic);
      }
    });

    return Array.from(topics);
  }

  async generateReport(input: ProjectInput): Promise<ResearchReport> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    const costTracker = CostTracker.getInstance();
    if (!costTracker.canAffordOperation(ENHANCED_SEARCH_STRATEGY.total)) {
      throw new Error(`Research operation would exceed daily cost limit. Remaining budget: $${costTracker.getRemainingBudget().toFixed(4)}`);
    }

    // Multi-stage enhanced source retrieval
    const sources = await this.fetchSourcesMultiStage(input);
    
    const pipelineOptions: PipelineOptions = {
      mode: "deep-dive",
      strictMode: false,
      highDepthMode: true
    };

    const { results, metadata: pipelineMetadata } = await this.pipelineService.executePipeline(
      { sources },
      pipelineOptions
    );

    const finalStage = results.find(r => r.stage === 'finalReport');
    const report = finalStage?.output || "Pipeline failed to generate report";

    // Calculate enhanced metadata
    const detailScore = this.calculateDetailScore(sources);
    const sourceVariety = this.calculateSourceVariety(sources);
    const topicCoverage = this.calculateTopicCoverage(sources);
    const analysisDepth = pipelineMetadata.qualityGates.filter(qg => qg.passed).length / pipelineMetadata.qualityGates.length;

    return {
      report,
      sources,
      requestId,
      confidenceScore: this.calculateConfidenceScore(results, { results: sources }),
      metadata: {
        createdAt: Date.now(),
        requestId,
        wordCount: report.length,
        queryTerms: [`${input.project_name}`, `${input.project_name} crypto`], // Summary for display
        retries: 0,
        durationMs: Date.now() - startTime,
        totalSearchCost: ENHANCED_SEARCH_STRATEGY.total * 0.001,
        cacheHitRate: 0, // Would be calculated by search service
        searchQualityScore: this.calculateSearchQuality({ results: sources }),
        detailScore,
        sourceVariety,
        analysisDepth,
        topicCoverage,
        businessMetrics: {
          costPerQuery: 0.001,
          rateLimitStatus: 'healthy',
          performanceGrade: pipelineMetadata.performanceGrade,
        },
        pipelineMetadata
      },
    };
  }

  private calculateConfidenceScore(pipelineResults: any[], searchResults: any): number {
    const qualityGatesPassedRatio =
      pipelineResults.filter(r => r.qualityGate?.passed).length / pipelineResults.length;
    const searchQualityScore = this.calculateSearchQuality(searchResults);
    return (qualityGatesPassedRatio * 0.6) + (searchQualityScore * 0.4);
  }

  private calculateSearchQuality(searchResults: any): number {
    if (!searchResults.results || searchResults.results.length === 0) return 0;

    const avgContentLength = searchResults.results.reduce(
      (sum: number, r: any) => sum + r.content.length, 0
    ) / searchResults.results.length;
    const uniqueDomains = new Set(
      searchResults.results.map((r: any) => new URL(r.url).hostname)
    ).size;

    const contentScore = Math.min(avgContentLength / 1000, 1);
    const diversityScore = Math.min(uniqueDomains / 10, 1);

    return (contentScore * 0.7) + (diversityScore * 0.3);
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}