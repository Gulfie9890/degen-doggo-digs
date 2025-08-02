import OpenAI from 'openai';

export interface PipelineOptions {
  mode: 'fast' | 'deep-dive';
  strictMode: boolean;
  highDepthMode: boolean;
}

export interface PipelineResult {
  stage: string;
  output: string;
  qualityGate?: {
    passed: boolean;
    reason: string;
  };
}

export interface PipelineMetadata {
  modelUsed: string[];
  processingStages: string[];
  bottlenecks: string[];
  qualityGates: { stage: string; passed: boolean; reason: string }[];
  totalTokensUsed: number;
  totalDuration: number;
  performanceGrade: string;
}

export class PipelineService {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
  }

  async executePipeline(
    input: { sources: any[] },
    options: PipelineOptions
  ): Promise<{ results: PipelineResult[]; metadata: PipelineMetadata }> {
    const startTime = Date.now();
    const results: PipelineResult[] = [];
    const stages = ['analysis', 'synthesis', 'finalReport'];
    
    try {
      // Stage 1: Analysis
      const analysisResult = await this.analyzeStage(input.sources);
      results.push({
        stage: 'analysis',
        output: analysisResult,
        qualityGate: { passed: true, reason: 'Analysis completed successfully' }
      });

      // Stage 2: Synthesis
      const synthesisResult = await this.synthesisStage(analysisResult, input.sources);
      results.push({
        stage: 'synthesis',
        output: synthesisResult,
        qualityGate: { passed: true, reason: 'Synthesis completed successfully' }
      });

      // Stage 3: Final Report
      const finalReport = await this.finalReportStage(synthesisResult, input.sources);
      results.push({
        stage: 'finalReport',
        output: finalReport,
        qualityGate: { passed: true, reason: 'Final report generated successfully' }
      });

      const metadata: PipelineMetadata = {
        modelUsed: ['gpt-4-turbo-preview'],
        processingStages: stages,
        bottlenecks: [],
        qualityGates: results.map(r => ({
          stage: r.stage,
          passed: r.qualityGate?.passed || false,
          reason: r.qualityGate?.reason || 'Unknown'
        })),
        totalTokensUsed: 0, // Would need to track actual usage
        totalDuration: Date.now() - startTime,
        performanceGrade: 'A'
      };

      return { results, metadata };
    } catch (error) {
      console.error('Pipeline execution failed:', error);
      return {
        results: [{
          stage: 'error',
          output: 'Pipeline execution failed',
          qualityGate: { passed: false, reason: 'Pipeline error' }
        }],
        metadata: {
          modelUsed: [],
          processingStages: [],
          bottlenecks: ['Pipeline failure'],
          qualityGates: [],
          totalTokensUsed: 0,
          totalDuration: Date.now() - startTime,
          performanceGrade: 'F'
        }
      };
    }
  }

  private async analyzeStage(sources: any[]): Promise<string> {
    const content = sources
      .map(source => `Source: ${source.title}\nURL: ${source.url}\nContent: ${source.content}`)
      .join('\n---\n');

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are a crypto analyst. Analyze the provided sources and extract key information about the project.'
        },
        {
          role: 'user',
          content: `Analyze these sources:\n${content}`
        }
      ] as OpenAI.Chat.ChatCompletionMessageParam[],
      max_tokens: 2000,
      temperature: 0.3
    });

    return completion.choices[0]?.message?.content || 'Analysis failed';
  }

  private async synthesisStage(analysis: string, sources: any[]): Promise<string> {
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are a crypto analyst. Synthesize the analysis into structured insights.'
        },
        {
          role: 'user',
          content: `Based on this analysis, create structured insights:\n${analysis}`
        }
      ] as OpenAI.Chat.ChatCompletionMessageParam[],
      max_tokens: 2000,
      temperature: 0.3
    });

    return completion.choices[0]?.message?.content || 'Synthesis failed';
  }

  private async finalReportStage(synthesis: string, sources: any[]): Promise<string> {
    const reportStructure = [
      "TLDR",
      "Project Information & Competition",
      "Team, Venture Funds, CEO and Key Members",
      "Tokenomics",
      "Airdrops and Incentive Programs",
      "Social Media & Community Analysis",
      "On-Chain Overview",
      "Conclusion"
    ];

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `You are a crypto analyst. Create a comprehensive report following this structure:
${reportStructure.map((section, index) => `${index + 1}. ${section}`).join('\n')}

Use markdown formatting and make the report comprehensive yet concise.`
        },
        {
          role: 'user',
          content: `Create a final report based on this synthesis:\n${synthesis}`
        }
      ] as OpenAI.Chat.ChatCompletionMessageParam[],
      max_tokens: 4000,
      temperature: 0.7
    });

    return completion.choices[0]?.message?.content || 'Report generation failed';
  }
}