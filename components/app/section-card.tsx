import type React from "react";

import { Card } from "@/components/ui/card";

export function SectionCard(props: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-brand-primary">{props.title}</h2>
          {props.subtitle ? <p className="mt-1 text-xs text-brand-secondary">{props.subtitle}</p> : null}
        </div>
        {props.actions ? <div className="flex items-center gap-2">{props.actions}</div> : null}
      </div>
      <div className="mt-4">{props.children}</div>
    </Card>
  );
}

