import { Card } from "@/components/ui/card";

export function StatCard(props: { label: string; value: string | number; hint?: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-semibold text-brand-secondary uppercase tracking-wide">{props.label}</p>
      <p className="mt-2 text-2xl font-semibold text-brand-primary">{props.value}</p>
      {props.hint ? <p className="mt-1 text-xs text-brand-secondary">{props.hint}</p> : null}
    </Card>
  );
}

