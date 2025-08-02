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
  max_completion_tokens: 8192,
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
    
    // Implement tiered source processing to maximize information utilization
    const tierSizes = {
      premium: Math.min(15, processedSources.length), // Top sources get full content
      standard: Math.min(40, Math.max(0, processedSources.length - 15)), // Next tier gets summarized
      compressed: Math.min(100, Math.max(0, processedSources.length - 55)) // Rest get compressed summaries
    };
    
    // Process premium sources (full content)
    const premiumSources = processedSources.slice(0, tierSizes.premium);
    const premiumText = premiumSources.map((source, index) => 
      `Premium Source ${index + 1}: ${source.title}\nURL: ${source.url}\nQuality Score: ${source.qualityScore}\nContent: ${source.content.substring(0, 8000)}${source.content.length > 8000 ? '...' : ''}\n\n`
    ).join('');
    
    // Process standard sources (summarized content)
    const standardSources = processedSources.slice(tierSizes.premium, tierSizes.premium + tierSizes.standard);
    let standardText = '';
    if (standardSources.length > 0) {
      const standardSummaries = await this.summarizeSources(standardSources, 'standard');
      standardText = standardSummaries.map((summary, index) => 
        `Standard Source ${index + 1}: ${standardSources[index].title}\nURL: ${standardSources[index].url}\nSummary: ${summary}\n\n`
      ).join('');
    }
    
    // Process compressed sources (brief summaries)
    const compressedSources = processedSources.slice(tierSizes.premium + tierSizes.standard, tierSizes.premium + tierSizes.standard + tierSizes.compressed);
    let compressedText = '';
    if (compressedSources.length > 0) {
      const compressedSummaries = await this.summarizeSources(compressedSources, 'compressed');
      compressedText = `\nAdditional Sources (${compressedSources.length} sources):\n` + 
        compressedSummaries.map((summary, index) => 
          `${index + 1}. ${compressedSources[index].title}: ${summary}`
        ).join('\n') + '\n\n';
    }
    
    const sourcesText = premiumText + standardText + compressedText;
    
    this.logDebug('source_processing', {
      totalSources: processedSources.length,
      premiumSources: tierSizes.premium,
      standardSources: tierSizes.standard,
      compressedSources: tierSizes.compressed,
      totalContentLength: sourcesText.length
    });

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
      sourcesUsed: processedSources.length,
      reportLength: result.length,
      averageSourceQuality: processedSources.length > 0 ? processedSources.reduce((sum, s) => sum + s.qualityScore, 0) / processedSources.length : 0
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
    return this.runPipeline(input);
  }

  async runPipeline(input) {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    try {
      // Check cost constraints before starting
      const currentCost = this.costTracker.getTotalCost();
      if (currentCost > 50) {
        throw new Error('Cost limit exceeded');
      }

      this.logDebug('6-Stage Pipeline started', { requestId, input, currentCost });

      // ---------------------------
      // Stage 1: Source Gathering
      // ---------------------------
      this.logStage("Stage 1: Source Gathering", { status: "starting" });
      const sources = await this.fetchSourcesMultiStage(input);
      
      if (!sources || sources.length === 0) {
        throw new Error('No sources found for the given input');
      }

      this.logStage("Stage 1: Source Gathering", { 
        status: "completed",
        count: sources.length,
        avgContentLength: sources.reduce((sum, s) => sum + s.content.length, 0) / sources.length
      });

      // ---------------------------
      // Stage 2: Content Extraction
      // ---------------------------
      this.logStage("Stage 2: Content Extraction", { status: "starting", model: "gpt-4.1-2025-04-14" });
      const extractedSources = [];
      
      // Process sources in batches to avoid rate limits
      const batchSize = 10;
      for (let i = 0; i < Math.min(sources.length, 50); i += batchSize) {
        const batch = sources.slice(i, i + batchSize);
        const batchPromises = batch.map(async (src) => {
          try {
            const summary = await this.llmCall("gpt-4.1-2025-04-14", 500, `
              Summarize the following source in exactly 200-300 tokens, keeping all factual details about the crypto project:
              Title: ${src.title}
              URL: ${src.url}
              Content: ${src.content.substring(0, 4000)}
              
              Focus on: team, tokenomics, partnerships, technology, community metrics, and any concrete data.
            `);
            return { ...src, summary, extracted: true };
          } catch (error) {
            console.warn(`Failed to extract content for ${src.url}:`, error.message);
            return { ...src, summary: src.content.substring(0, 300), extracted: false };
          }
        });
        
        const batchResults = await Promise.all(batchPromises);
        extractedSources.push(...batchResults);
        
        // Small delay between batches
        if (i + batchSize < Math.min(sources.length, 50)) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      this.logStage("Stage 2: Content Extraction", { 
        status: "completed",
        processed: extractedSources.length,
        successful: extractedSources.filter(s => s.extracted).length
      });

      // ---------------------------
      // Stage 3: Synthesis
      // ---------------------------
      this.logStage("Stage 3: Synthesis", { status: "starting", model: "gpt-4.1-2025-04-14" });
      const synthesis = await this.llmCall("gpt-4.1-2025-04-14", 8000, `
        Using the following extracted content, synthesize a detailed factual report covering all sections.
        AVOID SPECULATION - focus only on verified facts and data.
        
        Required sections: ${REPORT_STRUCTURE.join(", ")}
        
        Extracted Sources:
        ${extractedSources.map((s, idx) => `
        [Source ${idx + 1}] ${s.title}
        URL: ${s.url}
        Summary: ${s.summary}
        `).join("\n")}
        
        Create a comprehensive factual analysis covering each required section with specific data points and evidence.
      `);

      this.logStage("Stage 3: Synthesis", { 
        status: "completed",
        outputLength: synthesis.length
      });

      // ---------------------------
      // Stage 4: Speculation
      // ---------------------------
      this.logStage("Stage 4: Speculation", { status: "starting", model: "gpt-4.1-2025-04-14" });
      const speculation = await this.llmCall("gpt-4.1-2025-04-14", 6000, `
        Take the following factual synthesis and add a clearly marked speculation layer.
        
        Add sections for:
        - Potential future scenarios (3-6 months)
        - Market positioning predictions
        - Risk assessment and opportunities
        - Competitive advantages/disadvantages
        - Investment thesis considerations
        
        CLEARLY MARK speculation as separate from facts using headers like "🔮 SPECULATION:" or "📊 PREDICTIONS:"
        
        Factual Base:
        ${synthesis}
      `);

      this.logStage("Stage 4: Speculation", { 
        status: "completed",
        outputLength: speculation.length
      });

      // ---------------------------
      // Stage 5: Final Report
      // ---------------------------
      this.logStage("Stage 5: Final Report", { status: "starting", model: "gpt-4.1-2025-04-14" });
      const finalReport = await this.llmCall("gpt-4.1-2025-04-14", 12000, `
        Merge the following components into a polished, professional investor-grade research report.
        
        Use markdown formatting with clear headers for each section:
        ${REPORT_STRUCTURE.map(section => `## ${section}`).join("\n")}
        
        Structure:
        1. Start with factual synthesis as the foundation
        2. Integrate speculation clearly marked in appropriate sections
        3. Ensure professional tone and comprehensive coverage
        4. Include data points, metrics, and specific evidence
        5. End with a balanced conclusion covering both facts and predictions
        
        Factual Synthesis:
        ${synthesis}
        
        Speculation Layer:
        ${speculation}
      `);

      this.logStage("Stage 5: Final Report", { 
        status: "completed",
        outputLength: finalReport.length
      });

      // ---------------------------
      // Stage 6: Validation
      // ---------------------------
      this.logStage("Stage 6: Validation", { status: "starting", model: "gpt-4.1-2025-04-14" });
      const validation = await this.llmCall("gpt-4.1-2025-04-14", 1500, `
        Review the following final report for:
        - Structural completeness (all required sections present)
        - Factual consistency and logical flow
        - Appropriate separation of facts vs speculation
        - Professional presentation and formatting
        - Coverage of key crypto project aspects
        
        Provide a brief assessment and list any critical gaps or inconsistencies.
        
        Required sections to check: ${REPORT_STRUCTURE.join(", ")}
        
        Final Report:
        ${finalReport.substring(0, 8000)}...
      `);

      this.logStage("Stage 6: Validation", { 
        status: "completed",
        outputLength: validation.length
      });

      const endTime = Date.now();
      const totalDuration = endTime - startTime;

      this.logDebug('6-Stage Pipeline completed successfully', {
        requestId,
        totalDuration,
        totalSources: extractedSources.length,
        reportLength: finalReport.length,
        validationPassed: !validation.toLowerCase().includes('critical')
      });

      return {
        requestId,
        report: finalReport,
        sources: extractedSources.slice(0, 25), // Return top 25 sources for display
        metadata: {
          createdAt: Date.now(),
          totalDuration,
          sourcesAnalyzed: extractedSources.length,
          pipelineStages: this.debugLogs.filter(log => log.stage),
          validation: {
            report: validation,
            passed: !validation.toLowerCase().includes('critical')
          },
          confidenceScore: 0.85 // High confidence due to 6-stage process
        }
      };

    } catch (error) {
      const endTime = Date.now();
      this.logDebug('6-Stage Pipeline failed', { 
        requestId, 
        error: error.message, 
        duration: endTime - startTime 
      });
      
      throw new Error(`Pipeline failed: ${error.message}`);
    }
  }

  async llmCall(model, tokens, prompt) {
    try {
      // Use max_completion_tokens for newer models, max_tokens for older ones
      const isReasoningModel = model.startsWith("o1") || model.startsWith("o3") || model.startsWith("o4");
      const params = isReasoningModel 
        ? { model, max_completion_tokens: tokens, temperature: 0.3 }
        : { model, max_completion_tokens: tokens, temperature: 0.3 };

      const response = await this.openai.chat.completions.create({
        ...params,
        messages: [{ role: "user", content: prompt }]
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error(`LLM call failed for model ${model}:`, error.message);
      throw error;
    }
  }

  logStage(stage, details) {
    const logEntry = { 
      timestamp: Date.now(), 
      stage, 
      details,
      type: 'stage'
    };
    this.debugLogs.push(logEntry);
    console.log(`[STAGE] ${stage}`, details);
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

  // Source summarization methods for content compression
  async summarizeSources(sources, mode = 'standard') {
    const summaries = [];
    const batchSize = mode === 'compressed' ? 8 : 4; // Process more sources per batch for compressed mode
    
    for (let i = 0; i < sources.length; i += batchSize) {
      const batch = sources.slice(i, i + batchSize);
      const batchSummaries = await this.summarizeBatch(batch, mode);
      summaries.push(...batchSummaries);
      
      // Add delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return summaries;
  }
  
  async summarizeBatch(sources, mode) {
    const maxContentLength = mode === 'compressed' ? 2000 : 4000;
    const targetSummaryLength = mode === 'compressed' ? 150 : 300;
    
    const sourcesText = sources.map((source, index) => 
      `Source ${index + 1}: ${source.title}\nContent: ${source.content.substring(0, maxContentLength)}\n\n`
    ).join('');
    
    const prompt = mode === 'compressed' 
      ? `Provide brief ${targetSummaryLength}-character summaries for each source below. Focus on: key facts, tokenomics, team info, risks, and unique value propositions. Be concise but informative.\n\n${sourcesText}`
      : `Provide detailed ${targetSummaryLength}-character summaries for each source below. Include: project details, tokenomics, team background, partnerships, technical aspects, community sentiment, and any red flags.\n\n${sourcesText}`;
    
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4.1-2025-04-14",
        max_completion_tokens: mode === 'compressed' ? 1000 : 2000,
        temperature: 0.2,
        messages: [{ role: "user", content: prompt }]
      });
      
      const summaryText = response.choices[0].message.content;
      
      // Parse summaries - simple split approach
      const summaries = summaryText
        .split(/Source \d+:|^\d+\./gm)
        .slice(1) // Remove first empty element
        .map(s => s.trim())
        .filter(s => s.length > 20); // Filter out very short responses
      
      // Ensure we have summaries for all sources
      while (summaries.length < sources.length) {
        summaries.push(`Summary not available for ${sources[summaries.length].title}`);
      }
      
      this.logDebug('batch_summarization', {
        mode,
        sourcesCount: sources.length,
        summariesGenerated: summaries.length,
        tokensUsed: response.usage?.total_tokens || 0
      });
      
      return summaries.slice(0, sources.length);
    } catch (error) {
      console.error('Summarization failed:', error);
      this.logDebug('summarization_error', { mode, error: error.message });
      
      // Fallback: return truncated content
      return sources.map(source => 
        source.content.substring(0, targetSummaryLength) + (source.content.length > targetSummaryLength ? '...' : '')
      );
    }
  }

  generateRequestId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
}