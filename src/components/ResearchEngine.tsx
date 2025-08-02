import { useState } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { DeepResearchDegen, ProjectInput, ResearchReport } from '@/services/DeepResearchDegen';
import { Loader2, Search, Key, ExternalLink } from 'lucide-react';

export const ResearchEngine = () => {
  const { toast } = useToast();
  const [openaiKey, setOpenaiKey] = useState(localStorage.getItem('openai_key') || '');
  const [tavilyKey, setTavilyKey] = useState(localStorage.getItem('tavily_key') || '');
  const [projectInput, setProjectInput] = useState<ProjectInput>({
    project_name: '',
    project_website: '',
    project_twitter: '',
    project_contract: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [report, setReport] = useState<ResearchReport | null>(null);

  const saveApiKeys = () => {
    localStorage.setItem('openai_key', openaiKey);
    localStorage.setItem('tavily_key', tavilyKey);
    toast({
      title: "API Keys Saved",
      description: "Your API keys have been saved locally",
    });
  };

  const generateReport = async () => {
    if (!openaiKey || !tavilyKey) {
      toast({
        title: "Missing API Keys",
        description: "Please provide both OpenAI and Tavily API keys",
        variant: "destructive",
      });
      return;
    }

    if (!projectInput.project_name) {
      toast({
        title: "Missing Project Name",
        description: "Please provide a project name",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setProgress(0);
    setReport(null);

    try {
      const researcher = new DeepResearchDegen(openaiKey, tavilyKey);
      
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 2000);

      const result = await researcher.generateReport(projectInput);
      
      clearInterval(progressInterval);
      setProgress(100);
      setReport(result);

      toast({
        title: "Research Complete",
        description: "Your crypto research report has been generated",
      });
    } catch (error) {
      console.error('Research failed:', error);
      toast({
        title: "Research Failed",
        description: error instanceof Error ? error.message : "Failed to generate report",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <Card className="border-primary/20">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Crypto Research Engine
            </CardTitle>
            <CardDescription>
              Deep dive into any crypto project with AI-powered research and analysis
            </CardDescription>
          </CardHeader>
        </Card>

        {/* API Configuration Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-4 h-4" />
              API Configuration
            </CardTitle>
            <CardDescription>
              Enter your API keys to enable crypto research functionality
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="openai-key">OpenAI API Key</Label>
                <Input
                  id="openai-key"
                  type="password"
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                  placeholder="sk-..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tavily-key">Tavily API Key</Label>
                <Input
                  id="tavily-key"
                  type="password"
                  value={tavilyKey}
                  onChange={(e) => setTavilyKey(e.target.value)}
                  placeholder="tvly-..."
                />
              </div>
            </div>
            <Button onClick={saveApiKeys} className="w-full">
              Save API Keys
            </Button>
          </CardContent>
        </Card>

        <Separator />

        {/* Project Research Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              Project Research
            </CardTitle>
            <CardDescription>
              Enter project details to generate a comprehensive research report
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="project-name">Project Name *</Label>
                <Input
                  id="project-name"
                  value={projectInput.project_name}
                  onChange={(e) => setProjectInput({...projectInput, project_name: e.target.value})}
                  placeholder="e.g., Ethereum, Chainlink, Uniswap"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="project-website">Project Website</Label>
                <Input
                  id="project-website"
                  value={projectInput.project_website}
                  onChange={(e) => setProjectInput({...projectInput, project_website: e.target.value})}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="project-twitter">Twitter Handle</Label>
                <Input
                  id="project-twitter"
                  value={projectInput.project_twitter}
                  onChange={(e) => setProjectInput({...projectInput, project_twitter: e.target.value})}
                  placeholder="@projectname"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="project-contract">Contract Address</Label>
                <Input
                  id="project-contract"
                  value={projectInput.project_contract || ''}
                  onChange={(e) => setProjectInput({...projectInput, project_contract: e.target.value})}
                  placeholder="0x..."
                />
              </div>
            </div>
            
            {isLoading && (
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Generating research report...</div>
                <Progress value={progress} className="w-full" />
              </div>
            )}

            <Button 
              onClick={generateReport} 
              disabled={isLoading || !openaiKey || !tavilyKey}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Researching...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Generate Research Report
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results Section - Only show when report exists */}
        {report && (
          <>
            <Separator />
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ExternalLink className="w-4 h-4" />
                    Research Metadata
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Confidence Score</div>
                    <div className="text-2xl font-bold text-primary">
                      {(report.confidenceScore * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Sources Found</div>
                    <div className="text-2xl font-bold text-primary">
                      {report.sources.length}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Word Count</div>
                    <div className="text-2xl font-bold text-primary">
                      {report.metadata.wordCount.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Duration</div>
                    <div className="text-2xl font-bold text-primary">
                      {(report.metadata.durationMs / 1000).toFixed(1)}s
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Research Report</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                      {report.report}
                    </pre>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Sources ({report.sources.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {report.sources.map((source, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h4 className="font-medium">{source.title}</h4>
                            <a 
                              href={source.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-sm text-primary hover:underline"
                            >
                              {source.url}
                            </a>
                          </div>
                          <ExternalLink className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-3">
                          {source.content.substring(0, 200)}...
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
};