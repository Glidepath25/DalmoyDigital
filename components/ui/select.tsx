import type React from "react";
import clsx from "clsx";

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { className, ...rest } = props;
  return (
    <select
      className={clsx(
        "w-full rounded-md border border-app-border bg-white px-3 py-2 text-sm text-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition-colors",
        className
      )}
      {...rest}
    />
  );
}
