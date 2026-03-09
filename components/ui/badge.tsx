import type React from "react";
import clsx from "clsx";

export function Badge(
  props: React.HTMLAttributes<HTMLSpanElement> & { tone?: "neutral" | "success" | "warning" | "danger" }
) {
  const { className, tone = "neutral", ...rest } = props;
  const base = "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold border whitespace-nowrap";
  const toneClass =
    tone === "success"
      ? "bg-semantic-success/12 text-semantic-success border-semantic-success/30"
      : tone === "warning"
        ? "bg-semantic-warning/12 text-brand-primary border-semantic-warning/35"
      : tone === "danger"
          ? "bg-semantic-danger/10 text-semantic-danger border-semantic-danger/30"
          : "bg-brand-accentSoft text-brand-primary border-brand-accent/25";
  return <span className={clsx(base, toneClass, className)} {...rest} />;
}
