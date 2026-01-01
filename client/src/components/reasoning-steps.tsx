import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Circle, Loader2 } from "lucide-react";
import type { ReasoningStep } from "@shared/schema";

interface ReasoningStepsProps {
  steps: ReasoningStep[];
  isStreaming?: boolean;
  currentStep?: number;
}

export function ReasoningSteps({
  steps,
  isStreaming = false,
  currentStep,
}: ReasoningStepsProps) {
  const [expandedSteps, setExpandedSteps] = useState<string[]>(
    steps.length > 0 ? ["step-0"] : []
  );

  if (steps.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground" data-testid="reasoning-empty">
        No reasoning steps yet. Submit a prompt to see the agent&apos;s thought process.
      </div>
    );
  }

  return (
    <div className="space-y-2" data-testid="reasoning-steps">
      <Accordion
        type="multiple"
        value={expandedSteps}
        onValueChange={setExpandedSteps}
      >
        {steps.map((step, index) => {
          const isComplete =
            currentStep === undefined || index < currentStep;
          const isCurrent = currentStep !== undefined && index === currentStep;

          return (
            <AccordionItem
              key={index}
              value={`step-${index}`}
              className="border rounded-md px-4 mb-2"
              data-testid={`reasoning-step-${index}`}
            >
              <AccordionTrigger className="py-3 hover:no-underline">
                <div className="flex items-center gap-3">
                  {isCurrent && isStreaming ? (
                    <Loader2 className="w-4 h-4 animate-spin text-chart-1" />
                  ) : isComplete ? (
                    <CheckCircle className="w-4 h-4 text-chart-2" />
                  ) : (
                    <Circle className="w-4 h-4 text-muted-foreground" />
                  )}
                  <Badge variant="outline" className="font-mono text-xs">
                    Step {step.step}
                  </Badge>
                  <span className="text-sm font-medium truncate max-w-md">
                    {step.thought.slice(0, 60)}
                    {step.thought.length > 60 ? "..." : ""}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="space-y-3 pl-7">
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Thought
                    </span>
                    <p className="text-sm mt-1">{step.thought}</p>
                  </div>
                  {step.action && (
                    <div>
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Action
                      </span>
                      <p className="text-sm mt-1 font-mono bg-muted/50 p-2 rounded">
                        {step.action}
                      </p>
                    </div>
                  )}
                  {step.observation && (
                    <div>
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Observation
                      </span>
                      <p className="text-sm mt-1">{step.observation}</p>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
