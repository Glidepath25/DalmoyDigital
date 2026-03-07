import clsx from "clsx";

export function DownloadLink(props: { href: string; label: string; variant?: "primary" | "secondary" }) {
  const variant = props.variant ?? "secondary";
  const base =
    "inline-flex items-center justify-center rounded-md text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:ring-offset-2 focus:ring-offset-app-bg transition-colors";
  const sizing = "px-3 py-1.5";
  const styles =
    variant === "primary"
      ? "bg-brand-primary text-white hover:bg-brand-secondary border border-brand-primary"
      : "bg-white text-brand-primary border border-app-border hover:bg-app-bg";

  return (
    <a className={clsx(base, sizing, styles)} href={props.href}>
      {props.label}
    </a>
  );
}

