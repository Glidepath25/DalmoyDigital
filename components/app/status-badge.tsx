import clsx from "clsx";

export function StatusBadge(props: { name: string }) {
  const normalized = props.name.trim().toLowerCase();

  const toneClass =
    normalized === "complete" || normalized === "completed"
      ? "bg-semantic-success/10 text-semantic-success border-semantic-success/20"
      : normalized === "in progress"
        ? "bg-brand-accent/15 text-brand-primary border-brand-accent/30"
        : normalized === "snagging"
          ? "bg-semantic-warning/15 text-brand-primary border-semantic-warning/30"
          : normalized === "costing"
            ? "bg-app-bg text-brand-secondary border-app-border"
            : normalized === "on hold"
              ? "bg-brand-secondary/10 text-brand-secondary border-brand-secondary/20"
              : normalized === "cancelled" || normalized === "canceled"
                ? "bg-semantic-danger/10 text-semantic-danger border-semantic-danger/20"
                : "bg-app-bg text-brand-secondary border-app-border";

  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold border whitespace-nowrap",
        toneClass
      )}
      title={props.name}
    >
      {props.name}
    </span>
  );
}

