import type { AgentConfig, AgentPersona } from "./types.js";

export const DEFAULT_AGENT_CONFIG: AgentConfig = {
  consistencyMode: "fast",
  validationLevel: "medium",
  enableSelfCritique: true,
  enablePhilosopher: false,
  enableGrokSecondOpinion: false,
  maxTokens: 4096,
  temperature: 0.7,
};

export const STRICT_AGENT_CONFIG: AgentConfig = {
  consistencyMode: "robust",
  validationLevel: "strict",
  enableSelfCritique: true,
  enablePhilosopher: true,
  enableGrokSecondOpinion: true,
  maxTokens: 4096,
  temperature: 0.4,
};

export const AGENT_PERSONAS: AgentPersona[] = [
  {
    id: "architect",
    name: "The Architect",
    tagline: "Designs robust, scalable system blueprints",
    description: "Creates comprehensive system designs with clear component boundaries, data flow diagrams, and architectural patterns. Evaluates trade-offs and recommends optimal structures.",
    capabilities: [
      "System architecture design",
      "Component decomposition",
      "Pattern recommendations",
      "Scalability analysis"
    ],
    icon: "Grid3X3",
    color: "chart-1"
  },
  {
    id: "mechanic",
    name: "The Mechanic",
    tagline: "Diagnoses and repairs code issues",
    description: "Identifies root causes of bugs, performance bottlenecks, and code quality issues. Provides targeted fixes with minimal side effects.",
    capabilities: [
      "Bug diagnosis",
      "Performance optimization",
      "Code quality fixes",
      "Dependency resolution"
    ],
    icon: "Wrench",
    color: "chart-4"
  },
  {
    id: "codeNinja",
    name: "The Code Ninja",
    tagline: "Executes fast, precise implementations",
    description: "Writes clean, efficient code following best practices. Implements features quickly while maintaining code quality and test coverage.",
    capabilities: [
      "Feature implementation",
      "Code generation",
      "Refactoring",
      "Test writing"
    ],
    icon: "Zap",
    color: "chart-2"
  },
  {
    id: "philosopher",
    name: "The Philosopher",
    tagline: "Evaluates decisions and identifies opportunities",
    description: "Provides meta-analysis of code and architecture decisions. Identifies cognitive biases, adjacent opportunities, and process improvements.",
    capabilities: [
      "Decision analysis",
      "Bias detection",
      "Opportunity mapping",
      "Process evaluation"
    ],
    icon: "Brain",
    color: "chart-3"
  }
];
