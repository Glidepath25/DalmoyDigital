import Link from "next/link";
import clsx from "clsx";

const items = [
  { key: "home", label: "Overview", href: "/admin" },
  { key: "projects", label: "Projects", href: "/admin/projects" },
  { key: "users", label: "Users", href: "/admin/users" },
  { key: "clients", label: "Clients", href: "/admin/clients" },
  { key: "statuses", label: "Statuses", href: "/admin/statuses" },
  { key: "lookups", label: "Lookups", href: "/admin/lookups" }
] as const;

export type AdminNavKey = (typeof items)[number]["key"];

export function AdminNav(props: { active: AdminNavKey }) {
  return (
    <div className="dd-card p-2 overflow-x-auto">
      <nav className="flex items-center gap-1 min-w-max">
        {items.map((it) => {
          const active = it.key === props.active;
          return (
            <Link
              className={clsx(
                "rounded-md px-3 py-2 text-sm font-semibold transition-colors",
                active
                  ? "bg-brand-primary text-white"
                  : "text-brand-secondary hover:bg-app-bg hover:text-brand-primary"
              )}
              href={it.href}
              key={it.key}
            >
              {it.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

