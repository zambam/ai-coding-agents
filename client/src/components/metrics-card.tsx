import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MetricsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  icon?: React.ReactNode;
}

export function MetricsCard({
  title,
  value,
  subtitle,
  trend,
  trendValue,
  icon,
}: MetricsCardProps) {
  const TrendIcon =
    trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor =
    trend === "up"
      ? "text-chart-2"
      : trend === "down"
        ? "text-destructive"
        : "text-muted-foreground";

  return (
    <Card data-testid={`metric-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-2xl font-bold tabular-nums">{value}</div>
        {(subtitle || trendValue) && (
          <div className="flex items-center gap-2 mt-1">
            {trendValue && (
              <div className={`flex items-center gap-1 text-xs ${trendColor}`}>
                <TrendIcon className="w-3 h-3" />
                <span>{trendValue}</span>
              </div>
            )}
            {subtitle && (
              <span className="text-xs text-muted-foreground">{subtitle}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
