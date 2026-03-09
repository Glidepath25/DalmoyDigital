import type React from "react";
import clsx from "clsx";

export function Button(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary" | "danger" | "inverse";
    size?: "sm" | "md";
  }
) {
  const { className, variant = "primary", size = "md", ...rest } = props;
  const base =
    "inline-flex items-center justify-center rounded-lg text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-brand-accent/40 focus:ring-offset-2 focus:ring-offset-app-bg transition-colors";
  const sizing = size === "sm" ? "px-3 py-1.5" : "px-4 py-2";
  const styles =
    variant === "primary"
      ? "border border-brand-accent bg-brand-accent text-white hover:border-brand-accentHover hover:bg-brand-accentHover"
      : variant === "inverse"
        ? "border border-white/30 bg-brand-shellElevated text-white hover:bg-white/10 hover:border-white/50"
      : variant === "danger"
        ? "border border-semantic-danger bg-semantic-danger text-white hover:opacity-95"
        : "border border-brand-primary bg-brand-primary text-white hover:bg-black";
  return <button className={clsx(base, sizing, styles, className)} {...rest} />;
}
