import type React from "react";
import clsx from "clsx";

export function Card(props: React.HTMLAttributes<HTMLDivElement>) {
  const { className, ...rest } = props;
  return <div className={clsx("rounded-xl border border-slate-200 bg-white", className)} {...rest} />;
}
