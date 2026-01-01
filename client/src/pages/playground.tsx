import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Navbar } from "@/components/navbar";
import { CodeBlock } from "@/components/code-block";
import { MetricsCard } from "@/components/metrics-card";
import { ReasoningSteps } from "@/components/reasoning-steps";
import { useToast } from "@/hooks/use-toast";
import {
  Grid3X3,
  Wrench,
  Zap,
  Brain,
  Send,
  Loader2,
  DollarSign,
  Clock,
  Target,
  Shield,
  Activity,
  Settings2,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import type {
  AgentType,
  AgentResponse,
  CLASSicMetrics,
  ConsistencyMode,
  ValidationLevel,
  ReasoningStep,
} from "@shared/schema";

const agentOptions: { id: AgentType; name: string; icon: typeof Grid3X3 }[] = [
  { id: "architect", name: "The Architect", icon: Grid3X3 },
  { id: "mechanic", name: "The Mechanic", icon: Wrench },
  { id: "codeNinja", name: "The Code Ninja", icon: Zap },
  { id: "philosopher", name: "The Philosopher", icon: Brain },
];

const samplePrompts: Record<AgentType, string> = {
  architect:
    "Design a real-time collaborative document editor with offline support. Consider: state synchronization, conflict resolution, and storage architecture.",
  mechanic:
    "The WebSocket connection keeps dropping after 30 seconds. Error: 'Connection closed: 1006'. How do I diagnose and fix this?",
  codeNinja:
    "Implement a rate limiter middleware for Express that uses a sliding window algorithm with Redis backing.",
  philosopher:
    "Evaluate the trade-offs between microservices and monolithic architecture for a startup with 5 developers.",
};

export default function Playground() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const searchParams = new URLSearchParams(window.location.search);
  const initialAgent = (searchParams.get("agent") as AgentType) || "architect";

  const [selectedAgent, setSelectedAgent] = useState<AgentType>(initialAgent);
  const [prompt, setPrompt] = useState(samplePrompts[initialAgent]);
  const [consistencyMode, setConsistencyMode] = useState<ConsistencyMode>("fast");
  const [validationLevel, setValidationLevel] = useState<ValidationLevel>("medium");
  const [enableSelfCritique, setEnableSelfCritique] = useState(true);
  const [showConfig, setShowConfig] = useState(false);

  const [response, setResponse] = useState<AgentResponse | null>(null);
  const [metrics, setMetrics] = useState<CLASSicMetrics | null>(null);
  const [streamingSteps, setStreamingSteps] = useState<ReasoningStep[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentStep, setCurrentStep] = useState<number | undefined>(undefined);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setPrompt(samplePrompts[selectedAgent]);
  }, [selectedAgent]);

  const handleSubmit = useCallback(async () => {
    if (!prompt.trim() || isStreaming) return;
    
    setIsStreaming(true);
    setStreamingSteps([]);
    setResponse(null);
    setMetrics(null);
    setProgress(0);
    setCurrentStep(0);

    try {
      const response = await fetch("/api/agents/invoke/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentType: selectedAgent,
          prompt,
          config: {
            consistencyMode,
            validationLevel,
            enableSelfCritique,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to invoke agent");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response body");
      }

      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            const eventType = line.slice(7);
            continue;
          }
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.step) {
                setStreamingSteps(prev => [...prev, data.step]);
                setCurrentStep(data.step.step - 1);
                setProgress(data.progress * 100);
              }
              
              if (data.metrics) {
                setMetrics(data.metrics);
              }
              
              if (data.response) {
                setResponse(data.response);
                setStreamingSteps(data.response.reasoning || []);
              }
            } catch (e) {
              console.error("Failed to parse SSE data:", e);
            }
          }
        }
      }
    } catch (error) {
      console.error("Stream error:", error);
      toast({
        title: "Failed to invoke agent",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsStreaming(false);
      setCurrentStep(undefined);
      setProgress(100);
    }
  }, [prompt, selectedAgent, consistencyMode, validationLevel, enableSelfCritique, isStreaming, toast]);

  const SelectedAgentIcon = agentOptions.find((a) => a.id === selectedAgent)?.icon || Grid3X3;
  const displaySteps = response?.reasoning || streamingSteps;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="pt-20 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-playground-title">
                Agent Playground
              </h1>
              <p className="text-muted-foreground text-sm">
                Test the AI coding agents with your prompts and see reasoning in real-time.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowConfig(!showConfig)}
              data-testid="button-toggle-config"
            >
              <Settings2 className="h-4 w-4 mr-2" />
              {showConfig ? "Hide" : "Show"} Config
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Input Panel */}
            <div className="space-y-6">
              {/* Agent Selector */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Select Agent</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 gap-2">
                    {agentOptions.map((agent) => {
                      const isSelected = selectedAgent === agent.id;
                      return (
                        <Button
                          key={agent.id}
                          variant={isSelected ? "default" : "outline"}
                          className="justify-start h-auto py-3"
                          onClick={() => setSelectedAgent(agent.id)}
                          data-testid={`button-agent-${agent.id}`}
                        >
                          <agent.icon className="h-4 w-4 mr-2" />
                          <span className="text-sm">{agent.name}</span>
                        </Button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Configuration Panel */}
              {showConfig && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Configuration</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="consistency-mode">Consistency Mode</Label>
                        <Select
                          value={consistencyMode}
                          onValueChange={(v) => setConsistencyMode(v as ConsistencyMode)}
                        >
                          <SelectTrigger id="consistency-mode" data-testid="select-consistency-mode">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None (1 path)</SelectItem>
                            <SelectItem value="fast">Fast (2 paths)</SelectItem>
                            <SelectItem value="robust">Robust (3+ paths)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="validation-level">Validation Level</Label>
                        <Select
                          value={validationLevel}
                          onValueChange={(v) => setValidationLevel(v as ValidationLevel)}
                        >
                          <SelectTrigger id="validation-level" data-testid="select-validation-level">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="strict">Strict</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="self-critique">Enable Self-Critique</Label>
                      <Switch
                        id="self-critique"
                        checked={enableSelfCritique}
                        onCheckedChange={setEnableSelfCritique}
                        data-testid="switch-self-critique"
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Prompt Input */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <SelectedAgentIcon className="h-4 w-4" />
                    Prompt
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <Textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Enter your prompt..."
                    className="min-h-[150px] resize-none"
                    data-testid="input-prompt"
                  />
                  <Button
                    className="w-full mt-4"
                    onClick={handleSubmit}
                    disabled={isStreaming || !prompt.trim()}
                    data-testid="button-submit"
                  >
                    {isStreaming ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Run Agent
                      </>
                    )}
                  </Button>
                  {isStreaming && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                        <span>Reasoning in progress...</span>
                        <span>{Math.round(progress)}%</span>
                      </div>
                      <Progress value={progress} className="h-1" />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Metrics Dashboard */}
              {metrics && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <MetricsCard
                    title="Cost"
                    value={`$${metrics.cost.estimatedCost.toFixed(4)}`}
                    subtitle={`${metrics.cost.tokens} tokens`}
                    icon={<DollarSign className="h-4 w-4" />}
                  />
                  <MetricsCard
                    title="Latency"
                    value={`${metrics.latency.totalMs}ms`}
                    icon={<Clock className="h-4 w-4" />}
                  />
                  <MetricsCard
                    title="Accuracy"
                    value={`${Math.round(metrics.accuracy.taskSuccessRate * 100)}%`}
                    subtitle={`${metrics.accuracy.validationsPassed} validations`}
                    trend="up"
                    icon={<Target className="h-4 w-4" />}
                  />
                  <MetricsCard
                    title="Security"
                    value={metrics.security.safeCodeGenerated ? "Safe" : "Warning"}
                    icon={<Shield className="h-4 w-4" />}
                  />
                  <MetricsCard
                    title="Stability"
                    value={`${Math.round(metrics.stability.consistencyScore * 100)}%`}
                    subtitle={`${metrics.stability.pathsEvaluated} paths`}
                    icon={<Activity className="h-4 w-4" />}
                  />
                </div>
              )}
            </div>

            {/* Output Panel */}
            <div className="space-y-6">
              <Card className="h-full min-h-[600px]">
                <CardHeader className="pb-0">
                  <Tabs defaultValue="response" className="w-full">
                    <TabsList className="grid grid-cols-3 w-full">
                      <TabsTrigger value="response" data-testid="tab-response">
                        Response
                      </TabsTrigger>
                      <TabsTrigger value="reasoning" data-testid="tab-reasoning">
                        Reasoning
                      </TabsTrigger>
                      <TabsTrigger value="validations" data-testid="tab-validations">
                        Validations
                      </TabsTrigger>
                    </TabsList>

                    <CardContent className="pt-6">
                      <TabsContent value="response" className="mt-0">
                        {isStreaming && !response ? (
                          <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                          </div>
                        ) : response ? (
                          <div className="space-y-4">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">
                                Confidence: {Math.round(response.confidence * 100)}%
                              </Badge>
                            </div>
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                              <p data-testid="text-recommendation">{response.recommendation}</p>
                            </div>
                            {response.codeOutput && (
                              <CodeBlock
                                code={response.codeOutput}
                                language="typescript"
                                showLineNumbers
                              />
                            )}
                            {response.alternatives && response.alternatives.length > 0 && (
                              <div>
                                <h4 className="text-sm font-semibold mb-2">Alternatives</h4>
                                <ul className="text-sm text-muted-foreground space-y-1">
                                  {response.alternatives.map((alt, i) => (
                                    <li key={i} className="flex items-start gap-2">
                                      <span className="text-muted-foreground">-</span>
                                      {alt}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {response.warnings && response.warnings.length > 0 && (
                              <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
                                <h4 className="text-sm font-semibold text-destructive mb-2 flex items-center gap-2">
                                  <AlertCircle className="h-4 w-4" />
                                  Warnings
                                </h4>
                                <ul className="text-sm space-y-1">
                                  {response.warnings.map((warning, i) => (
                                    <li key={i}>{warning}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-12 text-muted-foreground" data-testid="text-empty-response">
                            Submit a prompt to see the agent's response.
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="reasoning" className="mt-0">
                        <ReasoningSteps
                          steps={displaySteps}
                          isStreaming={isStreaming}
                          currentStep={currentStep}
                        />
                      </TabsContent>

                      <TabsContent value="validations" className="mt-0">
                        {response ? (
                          <div className="space-y-4">
                            {response.validations.passed.length > 0 && (
                              <div>
                                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2 text-chart-2">
                                  <CheckCircle className="h-4 w-4" />
                                  Passed ({response.validations.passed.length})
                                </h4>
                                <ul className="text-sm space-y-1">
                                  {response.validations.passed.map((v, i) => (
                                    <li key={i} className="flex items-start gap-2 text-muted-foreground">
                                      <CheckCircle className="h-3 w-3 mt-1 text-chart-2 flex-shrink-0" />
                                      {v}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {response.validations.failed.length > 0 && (
                              <div>
                                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2 text-destructive">
                                  <AlertCircle className="h-4 w-4" />
                                  Failed ({response.validations.failed.length})
                                </h4>
                                <ul className="text-sm space-y-1">
                                  {response.validations.failed.map((v, i) => (
                                    <li key={i} className="flex items-start gap-2 text-muted-foreground">
                                      <AlertCircle className="h-3 w-3 mt-1 text-destructive flex-shrink-0" />
                                      {v}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {response.validations.passed.length === 0 &&
                              response.validations.failed.length === 0 && (
                                <div className="text-center py-8 text-muted-foreground">
                                  No validations performed.
                                </div>
                              )}
                          </div>
                        ) : (
                          <div className="text-center py-12 text-muted-foreground">
                            Submit a prompt to see validation results.
                          </div>
                        )}
                      </TabsContent>
                    </CardContent>
                  </Tabs>
                </CardHeader>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
