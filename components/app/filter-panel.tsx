import type React from "react";

import { Card } from "@/components/ui/card";

export function FilterPanel(props: { title?: string; children: React.ReactNode }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-primary">{props.title ?? "Filters"}</h2>
      </div>
      <div className="mt-3">{props.children}</div>
    </Card>
  );
}
