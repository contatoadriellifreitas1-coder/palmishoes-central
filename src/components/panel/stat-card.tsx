import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  trendLabel,
  loading,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  trend?: number;
  trendLabel?: string;
  loading?: boolean;
}) {
  const positive = (trend ?? 0) >= 0;
  return (
    <Card className="p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <Icon className="h-4.5 w-4.5" strokeWidth={2} />
        </span>
      </div>
      {loading ? (
        <div className="mt-4 h-8 w-28 animate-pulse rounded bg-muted" />
      ) : (
        <div className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{value}</div>
      )}
      {trend !== undefined ? (
        <div className="mt-2 flex items-center gap-1 text-xs">
          <span
            className={cn(
              "inline-flex items-center gap-0.5 font-medium",
              positive ? "text-success" : "text-destructive",
            )}
          >
            {positive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
            {Math.abs(trend)}%
          </span>
          {trendLabel ? <span className="text-muted-foreground">{trendLabel}</span> : null}
        </div>
      ) : null}
    </Card>
  );
}