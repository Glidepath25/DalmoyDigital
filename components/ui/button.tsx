import type React from "react";
import clsx from "clsx";

export function Button(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" }
) {
  const { className, variant = "primary", ...rest } = props;
  const base =
    "inline-flex items-center justify-center rounded-md text-sm font-medium px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const styles =
    variant === "primary"
      ? "bg-slate-900 text-white hover:bg-slate-800"
      : "bg-white text-slate-900 border border-slate-300 hover:bg-slate-50";
  return <button className={clsx(base, styles, className)} {...rest} />;
}
