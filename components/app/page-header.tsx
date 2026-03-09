import type React from "react";

export function PageHeader(props: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-accent">Dalmoy Project Delivery Platform</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-brand-primary">{props.title}</h1>
        {props.subtitle ? <p className="mt-1 text-sm text-brand-secondary">{props.subtitle}</p> : null}
      </div>
      {props.actions ? <div className="flex items-center gap-2">{props.actions}</div> : null}
    </div>
  );
}
