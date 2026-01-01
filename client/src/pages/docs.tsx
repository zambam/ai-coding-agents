import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { CodeBlock } from "@/components/code-block";
import {
  Grid3X3,
  Wrench,
  Zap,
  Brain,
  ChevronRight,
  BookOpen,
  FileCode,
  Settings,
  Terminal,
  Shield,
  Gauge,
} from "lucide-react";

const navSections = [
  { id: "getting-started", label: "Getting Started", icon: BookOpen },
  { id: "agents", label: "Agent Personas", icon: Grid3X3 },
  { id: "configuration", label: "Configuration", icon: Settings },
  { id: "reliability", label: "Reliability", icon: Shield },
  { id: "api", label: "API Reference", icon: FileCode },
];

const installCode = `npm install ai-coding-agents`;

const basicUsageCode = `import { Architect, CodeNinja, Mechanic, Philosopher } from 'ai-coding-agents';

// Initialize an agent
const architect = new Architect();

// Invoke with a prompt
const result = await architect.design({
  task: "Design a user authentication system",
  constraints: ["JWT tokens", "OAuth support", "Rate limiting"],
});

console.log(result.recommendation);
console.log(result.reasoning);  // Step-by-step thought process
console.log(result.confidence); // 0-1 confidence score`;

const replitMdExample = `## Agent Configuration

<!-- Agent behavior settings -->
consistency.mode: fast          # none | fast | robust
validationLevel: medium         # low | medium | high | strict
enableSelfCritique: true
enablePhilosopher: false        # optional meta-evaluation

## Code Standards

- Always use TypeScript strict mode
- No implicit any types
- Tests required for new functions
- Use semantic variable names

## Architectural Rules

- Prefer composition over inheritance
- Single Responsibility Principle
- DRY - Don't Repeat Yourself
- Maximum function length: 50 lines

## Security Constraints

- Always parameterize SQL queries
- Validate all user inputs
- Sanitize output for XSS prevention
- Use HTTPS for all external calls`;

const agentDescriptions = [
  {
    id: "architect",
    name: "The Architect",
    icon: Grid3X3,
    description: "Designs robust, scalable system blueprints with clear component boundaries and data flow.",
    methods: [
      { name: "design()", desc: "Create system architecture for a given task" },
      { name: "evaluate()", desc: "Analyze existing architecture for improvements" },
      { name: "decompose()", desc: "Break down a system into components" },
    ],
  },
  {
    id: "mechanic",
    name: "The Mechanic",
    icon: Wrench,
    description: "Diagnoses root causes of bugs and performance issues with targeted fixes.",
    methods: [
      { name: "diagnose()", desc: "Identify the root cause of an issue" },
      { name: "fix()", desc: "Generate code fixes for identified problems" },
      { name: "optimize()", desc: "Improve performance of existing code" },
    ],
  },
  {
    id: "codeNinja",
    name: "The Code Ninja",
    icon: Zap,
    description: "Writes clean, efficient code following best practices with high velocity.",
    methods: [
      { name: "implement()", desc: "Generate code for a feature or component" },
      { name: "refactor()", desc: "Improve code structure without changing behavior" },
      { name: "test()", desc: "Generate test cases for existing code" },
    ],
  },
  {
    id: "philosopher",
    name: "The Philosopher",
    icon: Brain,
    description: "Provides meta-analysis and identifies cognitive biases in decision-making.",
    methods: [
      { name: "evaluate()", desc: "Score and critique agent outputs" },
      { name: "identify()", desc: "Detect biases and blind spots" },
      { name: "map()", desc: "Find adjacent opportunities" },
    ],
  },
];

export default function Docs() {
  const [activeSection, setActiveSection] = useState("getting-started");

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="pt-20 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-8">
            {/* Sidebar Navigation */}
            <aside className="hidden lg:block w-64 flex-shrink-0">
              <nav className="sticky top-24 space-y-1">
                {navSections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => {
                      setActiveSection(section.id);
                      document.getElementById(section.id)?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors ${
                      activeSection === section.id
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                    data-testid={`nav-${section.id}`}
                  >
                    <section.icon className="h-4 w-4" />
                    {section.label}
                  </button>
                ))}
              </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 max-w-4xl">
              {/* Getting Started */}
              <section id="getting-started" className="mb-16">
                <h1 className="text-3xl font-bold mb-4" data-testid="text-docs-title">
                  Documentation
                </h1>
                <p className="text-muted-foreground mb-8">
                  Learn how to use AI Coding Agents to get reliable, quality-assured coding guidance
                  in your projects.
                </p>

                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Terminal className="h-5 w-5" />
                      Installation
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CodeBlock code={installCode} language="bash" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Basic Usage</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CodeBlock code={basicUsageCode} language="typescript" showLineNumbers />
                  </CardContent>
                </Card>
              </section>

              {/* Agent Personas */}
              <section id="agents" className="mb-16">
                <h2 className="text-2xl font-semibold mb-6">Agent Personas</h2>
                <p className="text-muted-foreground mb-6">
                  Each agent is specialized for a specific aspect of the development lifecycle.
                  Use them individually or orchestrate them together.
                </p>

                <div className="space-y-4">
                  {agentDescriptions.map((agent) => (
                    <Card key={agent.id} data-testid={`doc-agent-${agent.id}`}>
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-3">
                          <div className="p-2 rounded-md bg-primary/10">
                            <agent.icon className="h-5 w-5 text-primary" />
                          </div>
                          {agent.name}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground mb-4">{agent.description}</p>
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold">Methods</h4>
                          {agent.methods.map((method) => (
                            <div key={method.name} className="flex items-start gap-2 text-sm">
                              <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-xs">
                                {method.name}
                              </code>
                              <span className="text-muted-foreground">{method.desc}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>

              {/* Configuration */}
              <section id="configuration" className="mb-16">
                <h2 className="text-2xl font-semibold mb-6">Configuration</h2>
                <p className="text-muted-foreground mb-6">
                  Configure agent behavior through your project's <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-sm">replit.md</code> file
                  or programmatically when initializing agents.
                </p>

                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>replit.md Example</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CodeBlock code={replitMdExample} language="markdown" showLineNumbers />
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Consistency Mode</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm">
                      <ul className="space-y-2">
                        <li><Badge variant="outline">none</Badge> - Single reasoning path (fastest)</li>
                        <li><Badge variant="outline">fast</Badge> - Two paths with voting (default)</li>
                        <li><Badge variant="outline">robust</Badge> - Three+ paths (most reliable)</li>
                      </ul>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Validation Level</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm">
                      <ul className="space-y-2">
                        <li><Badge variant="outline">low</Badge> - Basic syntax checks</li>
                        <li><Badge variant="outline">medium</Badge> - Standard validations</li>
                        <li><Badge variant="outline">high</Badge> - Thorough quality checks</li>
                        <li><Badge variant="outline">strict</Badge> - Maximum scrutiny + Philosopher</li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </section>

              {/* Reliability */}
              <section id="reliability" className="mb-16">
                <h2 className="text-2xl font-semibold mb-6">Reliability Mechanisms</h2>
                <p className="text-muted-foreground mb-6">
                  Built-in quality assurance features ensure consistent, trustworthy outputs.
                </p>

                <div className="space-y-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2">
                        <Gauge className="h-5 w-5 text-chart-1" />
                        CLASSic Metrics
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground mb-4">
                        Every agent invocation is measured across five dimensions:
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        {["Cost", "Latency", "Accuracy", "Security", "Stability"].map((metric) => (
                          <div key={metric} className="text-center p-3 bg-muted/50 rounded-md">
                            <span className="text-sm font-medium">{metric}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle>Chain-of-Thought Reasoning</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">
                        Agents expose their step-by-step reasoning process, making it easy to understand
                        and verify their conclusions. Each step includes thought, action, and observation.
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle>Self-Consistency Voting</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">
                        For complex decisions, agents generate multiple independent reasoning paths and
                        select the most consistent conclusion. Configurable via <code className="font-mono bg-muted px-1 rounded">consistencyMode</code>.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </section>

              {/* API Reference */}
              <section id="api" className="mb-16">
                <h2 className="text-2xl font-semibold mb-6">API Reference</h2>
                <p className="text-muted-foreground mb-6">
                  Complete API documentation for all agent classes and utility functions.
                </p>

                <Card>
                  <CardContent className="py-8 text-center">
                    <p className="text-muted-foreground mb-4">
                      Full API reference coming soon. Try the playground to explore agent capabilities.
                    </p>
                    <Link href="/playground">
                      <Button data-testid="button-docs-playground">
                        Open Playground
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </section>
            </main>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
