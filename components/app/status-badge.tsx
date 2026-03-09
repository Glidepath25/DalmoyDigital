import clsx from "clsx";

export function StatusBadge(props: { name: string }) {
  const normalized = props.name.trim().toLowerCase();

  const toneClass =
    normalized === "complete" || normalized === "completed"
      ? "bg-semantic-success/12 text-semantic-success border-semantic-success/35"
      : normalized === "in progress"
        ? "bg-brand-accent/12 text-brand-primary border-brand-accent/35"
        : normalized === "snagging"
          ? "bg-semantic-warning/12 text-brand-primary border-semantic-warning/35"
          : normalized === "costing"
            ? "bg-brand-accentSoft text-brand-secondary border-brand-accent/30"
            : normalized === "on hold"
              ? "bg-brand-primary/8 text-brand-secondary border-brand-secondary/25"
              : normalized === "cancelled" || normalized === "canceled"
                ? "bg-semantic-danger/12 text-semantic-danger border-semantic-danger/30"
                : "bg-brand-accentSoft text-brand-secondary border-brand-accent/20";

  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold whitespace-nowrap",
        toneClass
      )}
      title={props.name}
    >
      {props.name}
    </span>
  );
}
