import type React from "react";
import Link from "next/link";

import { Card } from "@/components/ui/card";

export function EmptyState(props: {
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <Card className="p-8 text-center">
      <p className="text-sm font-semibold text-brand-primary">{props.title}</p>
      {props.description ? <p className="mt-2 text-sm text-brand-secondary">{props.description}</p> : null}
      {props.actionHref && props.actionLabel ? (
        <Link className="dd-link mt-4 inline-flex" href={props.actionHref}>
          {props.actionLabel}
        </Link>
      ) : null}
    </Card>
  );
}
