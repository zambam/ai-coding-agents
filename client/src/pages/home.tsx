import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { AgentCard } from "@/components/agent-card";
import { CodeBlock } from "@/components/code-block";
import {
  ArrowRight,
  CheckCircle,
  Shield,
  Gauge,
  GitBranch,
  Terminal,
} from "lucide-react";
import { AGENT_PERSONAS } from "@shared/schema";

const usageExample = `import { Architect, CodeNinja, Mechanic } from 'ai-coding-agents';

// Configure agents via your replit.md
const architect = new Architect({
  consistencyMode: 'fast',        // none | fast | robust
  validationLevel: 'medium',      // low | medium | high | strict
  enableGrokSecondOpinion: true,  // dual-LLM second opinion
});

// Design your system architecture
const blueprint = await architect.design({
  task: "Build a real-time chat application",
  constraints: ["TypeScript", "WebSocket", "PostgreSQL"],
});

// Implement with the Code Ninja
const code = await codeNinja.implement(blueprint);

// Debug issues with the Mechanic
const fixes = await mechanic.diagnose(code, {
  errorLog: "Connection refused on port 5432"
});`;

const steps = [
  {
    number: 1,
    title: "Configure via replit.md",
    description:
      "Set your project's coding standards, validation level, and agent preferences in your replit.md file.",
    icon: Terminal,
  },
  {
    number: 2,
    title: "Invoke Specialized Agents",
    description:
      "Use The Architect for design, Code Ninja for implementation, Mechanic for debugging, or Philosopher for meta-analysis.",
    icon: GitBranch,
  },
  {
    number: 3,
    title: "Get Reliable Results",
    description:
      "Every response includes confidence scores, reasoning steps, and validation checks using CLASSic metrics.",
    icon: CheckCircle,
  },
];

const reliabilityFeatures = [
  {
    title: "Chain-of-Thought",
    description: "Step-by-step reasoning with full transparency into the agent's thought process.",
    icon: GitBranch,
  },
  {
    title: "Self-Consistency",
    description: "Multiple reasoning paths with voting for more reliable outputs.",
    icon: Shield,
  },
  {
    title: "CLASSic Metrics",
    description: "Cost, Latency, Accuracy, Security, and Stability measurements on every call.",
    icon: Gauge,
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <Badge variant="secondary" className="mb-6" data-testid="badge-version">
            v1.0 Preview
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6" data-testid="text-hero-title">
            AI Coding Agents with{" "}
            <span className="text-chart-1">Built-in Reliability</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto" data-testid="text-hero-description">
            Four specialized agents for architecture, implementation, debugging, and meta-evaluation.
            Dual-LLM reasoning with Grok for uncensored second opinions.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/playground">
              <Button size="lg" data-testid="button-try-demo">
                Try the Playground
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/docs">
              <Button variant="outline" size="lg" data-testid="button-view-docs">
                View Documentation
              </Button>
            </Link>
          </div>

          <div className="flex items-center justify-center gap-6 mt-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-chart-2" />
              <span>npm installable</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-chart-2" />
              <span>GitHub-hosted</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-chart-2" />
              <span>Replit-ready</span>
            </div>
          </div>
        </div>
      </section>

      {/* Agent Cards Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-card/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-semibold mb-4" data-testid="text-agents-title">
              Four Specialized Personas
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Each agent is optimized for a specific aspect of the development lifecycle,
              working together through an orchestrated pipeline.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {AGENT_PERSONAS.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-semibold mb-4" data-testid="text-how-it-works-title">
              How It Works
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Configure once, invoke anywhere. Your replit.md becomes the single source of truth
              for agent behavior in your project.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step) => (
              <Card key={step.number} className="relative" data-testid={`card-step-${step.number}`}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                      {step.number}
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">{step.title}</h3>
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Code Example Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-card/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-semibold mb-4" data-testid="text-code-example-title">
              Simple, Powerful API
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Import the agents, configure your preferences, and get reliable AI-powered coding guidance.
            </p>
          </div>
          <CodeBlock code={usageExample} language="typescript" showLineNumbers />
        </div>
      </section>

      {/* Reliability Features Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-semibold mb-4" data-testid="text-reliability-title">
              Built for Reliability
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Every agent invocation includes mechanisms for quality assurance
              and logical consistency checking.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {reliabilityFeatures.map((feature) => (
              <Card key={feature.title} data-testid={`card-feature-${feature.title.toLowerCase().replace(/\s+/g, "-")}`}>
                <CardContent className="pt-6">
                  <feature.icon className="h-8 w-8 text-chart-1 mb-4" />
                  <h3 className="font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-card/30">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-semibold mb-4" data-testid="text-cta-title">
            Get Started Today
          </h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Install the package and start using reliable AI agents in your Replit projects.
          </p>
          <div className="bg-zinc-900 dark:bg-zinc-950 rounded-md p-4 max-w-md mx-auto mb-8">
            <code className="text-sm font-mono text-zinc-100">
              npm install ai-coding-agents
            </code>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/playground">
              <Button size="lg" data-testid="button-cta-playground">
                Open Playground
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="lg" data-testid="button-cta-github">
                View on GitHub
              </Button>
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
