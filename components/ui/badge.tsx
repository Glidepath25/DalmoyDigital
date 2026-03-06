import type React from "react";
import clsx from "clsx";

export function Badge(
  props: React.HTMLAttributes<HTMLSpanElement> & { tone?: "neutral" | "success" | "warning" | "danger" }
) {
  const { className, tone = "neutral", ...rest } = props;
  const base = "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold border";
  const toneClass =
    tone === "success"
      ? "bg-semantic-success/10 text-semantic-success border-semantic-success/20"
      : tone === "warning"
        ? "bg-semantic-warning/15 text-brand-primary border-semantic-warning/30"
        : tone === "danger"
          ? "bg-semantic-danger/10 text-semantic-danger border-semantic-danger/20"
          : "bg-app-bg text-brand-secondary border-app-border";
  return <span className={clsx(base, toneClass, className)} {...rest} />;
}

