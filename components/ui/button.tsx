import type React from "react";
import clsx from "clsx";

export function Button(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary" | "danger";
    size?: "sm" | "md";
  }
) {
  const { className, variant = "primary", size = "md", ...rest } = props;
  const base =
    "inline-flex items-center justify-center rounded-md text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:ring-offset-2 focus:ring-offset-app-bg transition-colors";
  const sizing = size === "sm" ? "px-3 py-1.5" : "px-4 py-2";
  const styles =
    variant === "primary"
      ? "bg-brand-primary text-white hover:bg-brand-secondary border border-brand-primary"
      : variant === "danger"
        ? "bg-semantic-danger text-white hover:opacity-95 border border-semantic-danger"
        : "bg-white text-brand-primary border border-app-border hover:bg-app-bg";
  return <button className={clsx(base, sizing, styles, className)} {...rest} />;
}
