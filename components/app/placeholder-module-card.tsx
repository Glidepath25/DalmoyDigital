import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export function PlaceholderModuleCard(props: { title: string; description: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-brand-primary">{props.title}</h3>
          <p className="mt-1 text-xs text-brand-secondary">{props.description}</p>
        </div>
        <Badge className="shrink-0" tone="neutral">
          Phase 2
        </Badge>
      </div>
      <div className="mt-4 h-24 rounded-lg border border-dashed border-app-border bg-app-bg flex items-center justify-center text-xs text-brand-secondary">
        Placeholder (ready for data wiring)
      </div>
    </Card>
  );
}
