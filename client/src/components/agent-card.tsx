import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Grid3X3, Wrench, Zap, Brain, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import type { AgentPersona } from "@shared/schema";

const iconMap = {
  Grid3X3,
  Wrench,
  Zap,
  Brain,
};

const colorMap: Record<string, string> = {
  "chart-1": "bg-chart-1/10 text-chart-1 dark:bg-chart-1/20",
  "chart-2": "bg-chart-2/10 text-chart-2 dark:bg-chart-2/20",
  "chart-3": "bg-chart-3/10 text-chart-3 dark:bg-chart-3/20",
  "chart-4": "bg-chart-4/10 text-chart-4 dark:bg-chart-4/20",
};

interface AgentCardProps {
  agent: AgentPersona;
}

export function AgentCard({ agent }: AgentCardProps) {
  const Icon = iconMap[agent.icon as keyof typeof iconMap];
  const colorClass = colorMap[agent.color] || colorMap["chart-1"];

  return (
    <Link href={`/playground?agent=${agent.id}`}>
      <Card
        className="group cursor-pointer transition-shadow duration-200 hover:shadow-lg h-full"
        data-testid={`card-agent-${agent.id}`}
      >
        <CardHeader className="flex flex-row items-start gap-4 pb-3">
          <div className={`p-3 rounded-md ${colorClass}`}>
            <Icon className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg">{agent.name}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{agent.tagline}</p>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-2 mb-4">
            {agent.capabilities.slice(0, 3).map((cap) => (
              <Badge key={cap} variant="secondary" className="text-xs">
                {cap}
              </Badge>
            ))}
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground group-hover:text-foreground transition-colors">
            <span>Try it</span>
            <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
