import type React from "react";
import clsx from "clsx";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props;
  return (
    <input
      className={clsx(
        "w-full rounded-md border border-app-border bg-white px-3 py-2 text-sm text-brand-primary placeholder:text-brand-secondary/70 focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition-colors",
        className
      )}
      {...rest}
    />
  );
}
