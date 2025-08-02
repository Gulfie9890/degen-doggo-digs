import { useState } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Loader2, Search, ExternalLink } from 'lucide-react';

interface ProjectInput {
  projectName: string;
  website: string;
  twitter: string;
  contractAddress: string;
}

interface ResearchReport {
  report: string;
  sources: Array<{
    title: string;
    url: string;
    content: string;
  }>;
  requestId: string;
  confidenceScore: number;
  metadata: {
    createdAt: number;
    requestId: string;
    sourcesFound: number;
    wordCount: number;
    detailScore: number;
    sourceVariety: number;
    topicCoverage: string[];
    duration: number;
    searchQueries: number;
    pipelineStages: number;
  };
}

export const ResearchEngine = () => {
  const { toast } = useToast();
  const [projectInput, setProjectInput] = useState<ProjectInput>({
    projectName: '',
    website: '',
    twitter: '',
    contractAddress: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [report, setReport] = useState<ResearchReport | null>(null);

  const generateReport = async () => {
    if (!projectInput.projectName) {
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
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 2000);

      // Call backend API
      const response = await fetch('/api/research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectName: projectInput.projectName,
          website: projectInput.website,
          twitter: projectInput.twitter,
          contractAddress: projectInput.contractAddress,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Research failed');
      }

      const result = await response.json();
      
      clearInterval(progressInterval);
      setProgress(100);
      setReport(result);

      toast({
        title: "Research Complete",
        description: `Generated report for ${projectInput.projectName} with ${result.sources.length} sources.`,
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
                  value={projectInput.projectName}
                  onChange={(e) => setProjectInput({...projectInput, projectName: e.target.value})}
                  placeholder="e.g., Ethereum, Chainlink, Uniswap"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="project-website">Project Website</Label>
                <Input
                  id="project-website"
                  value={projectInput.website}
                  onChange={(e) => setProjectInput({...projectInput, website: e.target.value})}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="project-twitter">Twitter Handle</Label>
                <Input
                  id="project-twitter"
                  value={projectInput.twitter}
                  onChange={(e) => setProjectInput({...projectInput, twitter: e.target.value})}
                  placeholder="@projectname"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="project-contract">Contract Address</Label>
                <Input
                  id="project-contract"
                  value={projectInput.contractAddress}
                  onChange={(e) => setProjectInput({...projectInput, contractAddress: e.target.value})}
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
              disabled={isLoading}
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
                      {(report.metadata.duration / 1000).toFixed(1)}s
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