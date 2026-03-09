import { Card } from "@/components/ui/card";

export function StatCard(props: { label: string; value: string | number; hint?: string }) {
  return (
    <Card className="p-4">
      <div className="h-1 w-10 rounded-full bg-brand-accent" />
      <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-secondary">{props.label}</p>
      <p className="mt-2 text-2xl font-semibold text-brand-primary">{props.value}</p>
      {props.hint ? <p className="mt-1 text-xs text-brand-secondary">{props.hint}</p> : null}
    </Card>
  );
}
