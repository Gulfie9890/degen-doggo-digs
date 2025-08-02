import OpenAI from "openai";

export class PipelineService {
  constructor(apiKey) {
    this.openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: false });
  }

  async executePipeline(input, options) {
    const startTime = Date.now();
    const results = [];

    try {
      // Analysis stage
      const analysis = await this.analyzeStage(input.sources);
      results.push({
        stage: 'analysis',
        output: analysis,
        qualityGate: analysis.length > 100
      });

      // Synthesis stage
      const synthesis = await this.synthesisStage(analysis, input.sources);
      results.push({
        stage: 'synthesis', 
        output: synthesis,
        qualityGate: synthesis.length > 200
      });

      // Final report stage
      const finalReport = await this.finalReportStage(synthesis, input.sources);
      results.push({
        stage: 'final_report',
        output: finalReport,
        qualityGate: finalReport.length > 500
      });

      const endTime = Date.now();
      
      return {
        results,
        metadata: {
          modelsUsed: ['gpt-4.1-2025-04-14'],
          stagesProcessed: results.length,
          bottlenecks: [],
          qualityGateResults: results.map(r => r.qualityGate),
          tokenUsage: { total: 0 },
          duration: endTime - startTime
        }
      };
    } catch (error) {
      console.error('Pipeline execution failed:', error);
      throw error;
    }
  }

  async analyzeStage(sources) {
    const sourcesText = sources.slice(0, 10).map(s => 
      `${s.title}: ${s.content.substring(0, 1000)}`
    ).join('\n\n');

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4.1-2025-04-14',
      messages: [{
        role: 'user',
        content: `Analyze these sources and extract key insights:\n\n${sourcesText}`
      }],
      max_completion_tokens: 1000
    });

    return response.choices[0].message.content;
  }

  async synthesisStage(analysis, sources) {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4.1-2025-04-14',
      messages: [{
        role: 'user',
        content: `Synthesize this analysis into structured insights:\n\n${analysis}`
      }],
      max_completion_tokens: 1500
    });

    return response.choices[0].message.content;
  }

  async finalReportStage(synthesis, sources) {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4.1-2025-04-14',
      messages: [{
        role: 'user',
        content: `Create a comprehensive final report based on this synthesis:\n\n${synthesis}`
      }],
      max_completion_tokens: 2000
    });

    return response.choices[0].message.content;
  }
}