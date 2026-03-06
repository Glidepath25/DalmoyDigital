import { ReactNode } from "react";

import { SectionCard } from "@/components/app/section-card";

export function DataTableShell(props: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <SectionCard title={props.title} subtitle={props.subtitle} actions={props.actions}>
      <div className="-mx-4 mt-2 overflow-x-auto">
        <div className="min-w-[720px] px-4">{props.children}</div>
      </div>
    </SectionCard>
  );
}

