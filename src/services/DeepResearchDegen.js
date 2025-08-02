import OpenAI from "openai";
import { EnhancedSearchService } from "./EnhancedSearchService.js";
import { CostTracker } from "./CostTracker.js";
import { SearchAnalytics } from "./SearchAnalytics.js";
import { PipelineService } from "./PipelineService.js";

// Exponential backoff utility for rate limit handling
async function withExponentialBackoff(fn, retries = 5, baseDelay = 1000) {
  let attempt = 0;
  while (attempt < retries) {
    try {
      return await fn();
    } catch (err) {
      // Check for rate limit errors from different APIs
      const isRateLimit = err.status === 429 || 
                         err.code === 'RateLimitError' ||
                         err.message?.includes('rate limit') ||
                         err.message?.includes('429');
      
      if (isRateLimit && attempt < retries - 1) {
        const delay = baseDelay * Math.pow(2, attempt); // 1s, 2s, 4s, 8s...
        console.warn(`Rate limit hit. Retrying in ${delay}ms... (attempt ${attempt + 1}/${retries})`);
        await new Promise(r => setTimeout(r, delay));
        attempt++;
      } else {
        throw err; // Other errors or max retries reached
      }
    }
  }
  throw new Error('Max retries reached after rate limit errors');
}

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

export const MODEL_CONFIG = {
  primary: "gpt-4.1-2025-04-14",
  reasoning: "o3-deep-research",
  fallback: "gpt-4.1-2025-04-14"
};

export const ENHANCED_SEARCH_STRATEGY = {
  base: { queries: 20, maxResults: 6 },
  deep: { queries: 25, maxResults: 4 }, 
  final: { queries: 20, maxResults: 5 },
  targeted: { queries: 15, maxResults: 4 }
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
      const searchResults = await withExponentialBackoff(() => 
        this.searchService.searchSingle(query, { maxResults })
      );
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
    this.logStage('multi_stage_search', 'Starting resilient multi-stage source gathering...');
    
    const stages = [
      {
        name: 'base',
        terms: [input.projectName, `${input.projectName} crypto`, `${input.projectName} token`].filter(Boolean),
        queryMultiplier: 2,
        essential: true
      },
      {
        name: 'deep',
        terms: [
          `${input.projectName} whitepaper`,
          `${input.projectName} tokenomics`,
          `${input.projectName} team`
        ],
        queryMultiplier: 2,
        essential: true
      },
      {
        name: 'market',
        terms: [
          `${input.projectName} price analysis`,
          `${input.projectName} trading volume`
        ],
        queryMultiplier: 1,
        essential: false
      },
      {
        name: 'risk',
        terms: [
          `${input.projectName} security audit`,
          `${input.projectName} risks`
        ],
        queryMultiplier: 1,
        essential: false
      }
    ];

    let allSources = [];
    const stageMetrics = [];
    let totalSuccessfulStages = 0;

    for (const stage of stages) {
      const stageStart = Date.now();
      this.logStage('stage_start', `Starting ${stage.name} stage`);
      
      try {
        const queries = this.expandQueries(stage.terms, stage.queryMultiplier);
        
        const searchResult = await withExponentialBackoff(
          () => this.searchService.searchEnhanced(queries, { maxResults: 3 }),
          stage.essential ? 3 : 1,
          1000
        );
        
        const stageDuration = Date.now() - stageStart;
        const stageSourceCount = searchResult.results.length;
        
        stageMetrics.push({
          stage: stage.name,
          queries: queries.length,
          sources: stageSourceCount,
          duration: stageDuration,
          success: stageSourceCount > 0
        });
        
        if (stageSourceCount > 0) {
          allSources.push(...searchResult.results);
          totalSuccessfulStages++;
          this.logStage('stage_success', `${stage.name} stage: ${stageSourceCount} sources`);
        } else {
          this.logStage('stage_empty', `${stage.name} stage: no sources found`);
          
          // If essential stage fails, try simplified query
          if (stage.essential && stage.terms.length > 0) {
            this.logStage('stage_retry', `Retrying ${stage.name} with simplified query`);
            const simpleQuery = stage.terms[0]; // Use first term only
            const fallbackResult = await this.searchService.searchSingle(simpleQuery, { maxResults: 5 });
            
            if (fallbackResult.results.length > 0) {
              allSources.push(...fallbackResult.results);
              totalSuccessfulStages++;
              this.logStage('stage_fallback_success', `${stage.name} fallback: ${fallbackResult.results.length} sources`);
            }
          }
        }
      } catch (error) {
        this.logStage('stage_error', `${stage.name} stage failed: ${error.message}`);
        stageMetrics.push({
          stage: stage.name,
          queries: 0,
          sources: 0,
          duration: Date.now() - stageStart,
          success: false,
          error: error.message
        });
      }
    }

    const uniqueSources = this.deduplicateSources(allSources);
    const totalSources = uniqueSources.length;

    this.logStage('multi_stage_search', {
      totalSources,
      totalSuccessfulStages,
      stageMetrics,
      totalQueries: stageMetrics.reduce((sum, stage) => sum + stage.queries, 0)
    });

    return uniqueSources;
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
    this.debugLogs = [];

    try {
      // Stage 1: Source Gathering + AI Ranking
      this.logStage("Stage 1: Source Gathering + AI Ranking", { model: MODEL_CONFIG.primary });
      const rawSources = await this.fetchSourcesMultiStage(input);
      
      // More flexible source threshold
      if (!rawSources || rawSources.length === 0) {
        this.logStage('source_fallback', 'No sources found, trying emergency fallback...');
        
        // Emergency fallback: try a simple search
        const emergencyResult = await this.searchService.searchSingle(
          input.projectName + ' cryptocurrency',
          { maxResults: 10, useFallback: true }
        );
        
        if (!emergencyResult || emergencyResult.results.length === 0) {
          throw new Error('Research pipeline failed: Unable to gather sufficient sources. Please try again.');
        }
        
        rawSources.push(...emergencyResult.results);
        this.logStage('source_emergency', `Emergency fallback found ${emergencyResult.results.length} sources`);
      }

      // AI-assisted source ranking
      const rankedSources = await this.rankSourcesWithAI(rawSources, input);

      // Stage 2: Content Extraction
      this.logStage("Stage 2: Content Extraction", { 
        model: MODEL_CONFIG.primary, 
        sources: rankedSources.length
      });
      
      const extractedSources = [];
      const batchSize = 10;
      for (let i = 0; i < Math.min(rankedSources.length, 100); i += batchSize) {
        const batch = rankedSources.slice(i, i + batchSize);
        const batchPromises = batch.map(async (source) => {
          try {
            const extractedContent = await this.llmCall(
              MODEL_CONFIG.primary,
              this.calculateDynamicTokens("extraction", source.content.length),
              `Extract and summarize the key information from this source in 200-500 tokens. Focus on factual content relevant to crypto/blockchain research:

Title: ${source.title}
URL: ${source.url}
Content: ${source.content.substring(0, 6000)}

Provide a structured summary with key facts, figures, and insights.`
            );
            
            return {
              ...source,
              extractedContent
            };
          } catch (error) {
            console.warn(`Failed to extract content from source:`, error.message);
            return null;
          }
        });
        
        const batchResults = await Promise.all(batchPromises);
        extractedSources.push(...batchResults.filter(Boolean));
      }

      // Stage 3: Factual Synthesis
      this.logStage("Stage 3: Factual Synthesis", { 
        model: MODEL_CONFIG.reasoning,
        sources: extractedSources.length 
      });
      
      const sourcesText = extractedSources
        .map(s => `Title: ${s.title}\nURL: ${s.url}\nContent: ${s.extractedContent}`)
        .join('\n\n---\n\n');
      
      const synthesis = await this.llmCall(
        MODEL_CONFIG.reasoning, 
        this.calculateDynamicTokens("synthesis", sourcesText.length),
        `Based on the following extracted sources, create a comprehensive factual synthesis covering these sections:
${REPORT_STRUCTURE.join('\n- ')}

Focus ONLY on factual information. Avoid speculation or predictions. Use specific data, quotes, and concrete details from the sources.

Sources:
${sourcesText}`
      );

      // Stage 4: Speculation
      this.logStage("Stage 4: Speculation", { 
        model: MODEL_CONFIG.reasoning
      });
      
      const speculation = await this.llmCall(
        MODEL_CONFIG.reasoning,
        this.calculateDynamicTokens("speculation", synthesis.length),
        `Based on the factual synthesis below, create a separate speculation analysis with:
- Potential future scenarios and market predictions
- Risk assessments and opportunity analysis
- Investment implications and strategic considerations
- Technology development forecasts
- Competitive landscape evolution

Keep this as a standalone speculative section, clearly separated from facts.

Factual Synthesis:
${synthesis}`
      );

      // Stage 5: Final Report Assembly
      this.logStage("Stage 5: Final Report Assembly", { 
        model: MODEL_CONFIG.reasoning
      });
      
      let finalReport = await this.llmCall(
        MODEL_CONFIG.reasoning,
        this.calculateDynamicTokens("final_report", synthesis.length + speculation.length),
        `Create a polished, professional investor-grade report with these components:

STRUCTURE (use these exact headings):
${REPORT_STRUCTURE.map(section => `## ${section}`).join('\n')}

## 🔮 Speculative Analysis
[Keep speculation in this separate, clearly marked section]

CONTENT TO MERGE:
Factual Synthesis:
${synthesis}

Speculative Analysis:
${speculation}

Format as comprehensive markdown with clear headings, bullet points, data tables where appropriate, and professional investment research tone.`
      );

      // Stage 6: Validation + Re-validation Loop
      this.logStage("Stage 6: Validation", { model: MODEL_CONFIG.primary });
      
      let validationPassed = false;
      let validationAttempts = 0;
      const maxValidationAttempts = 2;
      
      while (!validationPassed && validationAttempts < maxValidationAttempts) {
        let validation;
        
        // Handle large reports by chunking validation
        if (finalReport.length > 15000) {
          const chunks = this.chunkReportForValidation(finalReport, 12000);
          const chunkValidations = [];
          
          for (let i = 0; i < chunks.length; i++) {
            const chunkValidation = await this.llmCall(
              MODEL_CONFIG.primary,
              2000,
              `Review this section of a final report (Part ${i + 1}/${chunks.length}):

Criteria:
- Structural completeness for this section
- Factual accuracy and consistency  
- Professional tone and clarity
- Proper speculation separation

Respond with either:
"PASS: Section meets quality standards"
OR
"FAIL: [specific issues in this section]"

Report Section:
${chunks[i]}`
            );
            chunkValidations.push(chunkValidation);
          }
          
          // Aggregate chunk validations
          const failedChunks = chunkValidations.filter(v => v.includes("FAIL:"));
          if (failedChunks.length === 0) {
            validation = "PASS: All sections meet quality standards";
          } else {
            validation = `FAIL: Issues found in ${failedChunks.length}/${chunks.length} sections:\n${failedChunks.join('\n')}`;
          }
        } else {
          // Single validation for smaller reports
          validation = await this.llmCall(
            MODEL_CONFIG.primary,
            2000,
            `Review this final report for:
- Structural completeness (all required sections present)
- Factual accuracy and consistency  
- Professional tone and clarity
- Proper speculation separation
- Investment-grade quality

Respond with either:
"PASS: Report meets all quality standards"
OR
"FAIL: [specific issues to fix]"

Report to validate:
${finalReport}`
          );
        }

        if (validation.includes("PASS:")) {
          validationPassed = true;
          this.logStage("Validation Result", { status: "PASSED", attempts: validationAttempts + 1 });
        } else {
          validationAttempts++;
          this.logStage("Validation Result", { 
            status: "FAILED", 
            attempt: validationAttempts, 
            issues: validation 
          });
          
          if (validationAttempts < maxValidationAttempts) {
            // Re-run Stage 5 with validation feedback
            finalReport = await this.llmCall(
              MODEL_CONFIG.reasoning,
              this.calculateDynamicTokens("final_report", synthesis.length + speculation.length),
              `Revise the following report based on validation feedback:

VALIDATION ISSUES:
${validation}

ORIGINAL REPORT:
${finalReport}

FACTUAL CONTENT:
${synthesis}

SPECULATIVE CONTENT:
${speculation}

Create an improved version addressing all validation concerns.`
            );
          }
        }
      }

      const endTime = Date.now();
      
      // Add backward compatibility fields
      const compatibleSources = rawSources.map(source => ({
        ...source,
        snippet: source.content?.substring(0, 200) || ''
      }));

      return {
        requestId,
        report: finalReport,
        factualSynthesis: synthesis,
        speculativeAnalysis: speculation,
        sources: compatibleSources,
        extractedSources,
        metadata: {
          totalSources: rawSources.length,
          extractedSources: extractedSources.length,
          validationPassed,
          validationAttempts,
          createdAt: Date.now(),
          totalDuration: endTime - startTime,
          stages: this.debugLogs,
          // Calculated compatibility fields
          confidenceScore: this.calculateConfidenceScore(this.debugLogs, rawSources),
          wordCount: finalReport.split(' ').length,
          detailScore: this.calculateDetailScore(rawSources),
          sourceVariety: this.calculateSourceVariety(rawSources),
          topicCoverage: this.calculateTopicCoverage(rawSources)
        }
      };
      
    } catch (error) {
      console.error('Pipeline execution failed:', error);
      this.logStage("Pipeline Error", { error: error.message, stack: error.stack });
      
      // Enhanced error handling with fallback
      if (error.message.includes('model') || error.message.includes('API')) {
        throw new Error(`Research pipeline failed: ${error.message}. Please check API configuration and model availability.`);
      } else if (error.message.includes('sources')) {
        throw new Error(`Research pipeline failed: Unable to gather sufficient sources. Please try again.`);
      } else {
        throw new Error(`Research pipeline failed: ${error.message}`);
      }
    }
  }

  async rankSourcesWithAI(sources, query) {
    if (sources.length <= 20) return sources; // No need to rank if small set
    
    const sourcesList = sources.slice(0, 120).map((s, i) => 
      `${i + 1}. ${s.title} - ${s.url}\n   Preview: ${s.content.substring(0, 200)}...`
    ).join('\n\n');
    
    const ranking = await this.llmCall(
      MODEL_CONFIG.primary,
      3000,
      `Rank these sources by relevance for the crypto research query: "${query.projectName || query}"

Return a JSON array of source numbers in order of relevance.
Focus on sources that provide:
- Primary information about the project/token
- Financial data and metrics  
- Team and development info
- Community and social metrics
- Technical documentation

Sources:
${sourcesList}

Respond with ONLY a JSON array like: [1, 15, 3, 22, 8, ...]`
    );
    
    try {
      // First try to parse as JSON
      let rankings = [];
      try {
        const jsonMatch = ranking.match(/\[[\d,\s]+\]/);
        if (jsonMatch) {
          rankings = JSON.parse(jsonMatch[0]).map(n => parseInt(n) - 1);
        }
      } catch (parseError) {
        // Fallback to regex parsing
        rankings = ranking.match(/\d+/g)?.map(n => parseInt(n) - 1) || [];
      }
      
      // Validate rankings and ensure all sources are included
      const validRankings = rankings.filter(i => i >= 0 && i < sources.length);
      const rankedSources = validRankings
        .map(i => sources[i])
        .concat(sources.filter((_, i) => !validRankings.includes(i)))
        .slice(0, 100); // Cap at 100 ranked sources
        
      this.logStage("AI Source Ranking", { 
        originalCount: sources.length,
        rankedCount: rankedSources.length,
        validRankings: validRankings.length,
        topSources: rankedSources.slice(0, 5).map(s => s.title)
      });
      
      return rankedSources;
    } catch (error) {
      console.warn('Source ranking failed, using original order:', error.message);
      return sources.slice(0, 100);
    }
  }

  calculateDynamicTokens(stage, contentLength) {
    const baseTokens = {
      extraction: 1000,
      synthesis: 10000,
      speculation: 6000, 
      final_report: 16000
    };
    
    const contentFactor = Math.min(contentLength / 10000, 2); // Max 2x multiplier
    const dynamicTokens = Math.floor(baseTokens[stage] * (1 + contentFactor * 0.5));
    
    // Cap at reasonable maximums
    const maxTokens = {
      extraction: 2000,
      synthesis: 15000,
      speculation: 10000,
      final_report: 25000
    };
    
    return Math.min(dynamicTokens, maxTokens[stage] || baseTokens[stage]);
  }

  async llmCall(model, tokens, prompt) {
    try {
      // Use max_completion_tokens for newer models, max_tokens for older ones
      const isReasoningModel = model.startsWith("o1") || model.startsWith("o3") || model.startsWith("o4");
      const params = isReasoningModel 
        ? { model, max_completion_tokens: tokens, temperature: 0.3 }
        : { model, max_completion_tokens: tokens, temperature: 0.3 };

      const response = await withExponentialBackoff(() =>
        this.openai.chat.completions.create({
          ...params,
          messages: [{ role: "user", content: prompt }]
        })
      );

      // Enhanced response validation
      if (!response.choices?.[0]?.message?.content) {
        throw new Error(`Invalid response from model ${model}: No content returned`);
      }

      this.logDebug('llm_call_success', {
        model,
        tokens: response.usage?.total_tokens || 0,
        responseLength: response.choices[0].message.content.length
      });

      return response.choices[0].message.content;
    } catch (error) {
      this.logDebug('llm_call_error', { model, error: error.message });
      
      // Enhanced error handling with fallback
      if (error.message.includes('model') && model !== MODEL_CONFIG.fallback) {
        console.warn(`Model ${model} failed, attempting fallback to ${MODEL_CONFIG.fallback}`);
        return this.llmCall(MODEL_CONFIG.fallback, tokens, prompt);
      }
      
      console.error(`LLM call failed for model ${model}:`, error.message);
      throw new Error(`AI model call failed: ${error.message}`);
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

  calculateConfidenceScore(debugLogs, sources) {
    const stageCount = debugLogs.filter(log => log.type === 'stage').length;
    const sourceQuality = this.calculateSearchResultQuality(sources);
    const completionScore = stageCount >= 6 ? 90 : 60;
    return Math.round((completionScore + sourceQuality) / 2);
  }

  calculateSearchQuality(sources) {
    const detailScore = this.calculateDetailScore(sources);
    const sourceVariety = this.calculateSourceVariety(sources);
    const topicCoverage = this.calculateTopicCoverage(sources);
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
      
      // Small delay between batches (exponential backoff handles retries)
      await new Promise(resolve => setTimeout(resolve, 500));
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
      const response = await withExponentialBackoff(() =>
        this.openai.chat.completions.create({
          model: MODEL_CONFIG.primary,
          max_completion_tokens: mode === 'compressed' ? 1000 : 2000,
          temperature: 0.2,
          messages: [{ role: "user", content: prompt }]
        })
      );
      
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

  chunkReportForValidation(report, chunkSize = 12000) {
    const chunks = [];
    let currentPosition = 0;
    
    while (currentPosition < report.length) {
      let endPosition = currentPosition + chunkSize;
      
      // Try to break at paragraph boundaries for better context
      if (endPosition < report.length) {
        const nextParagraph = report.indexOf('\n\n', endPosition);
        const prevParagraph = report.lastIndexOf('\n\n', endPosition);
        
        // If we can find a reasonable paragraph break, use it
        if (nextParagraph !== -1 && nextParagraph - endPosition < 500) {
          endPosition = nextParagraph;
        } else if (prevParagraph !== -1 && endPosition - prevParagraph < 500) {
          endPosition = prevParagraph;
        }
      }
      
      chunks.push(report.substring(currentPosition, endPosition));
      currentPosition = endPosition;
    }
    
    return chunks;
  }

  generateRequestId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
}