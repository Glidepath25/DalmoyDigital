"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const TABS: Array<{ key: string; label: string; path: (projectId: string) => string }> = [
  { key: "overview", label: "Project Overview", path: (id) => `/projects/${id}` },
  { key: "correspondence", label: "Correspondence", path: (id) => `/projects/${id}/correspondence` },
  { key: "programme", label: "Programme of Works", path: (id) => `/projects/${id}/programme` },
  { key: "actions", label: "Critical Action Items", path: (id) => `/projects/${id}/actions` },
  { key: "finance", label: "Finance", path: (id) => `/projects/${id}/finance` },
  { key: "attachments", label: "Attachments", path: (id) => `/projects/${id}/attachments` },
  { key: "inspections", label: "Site Inspection Reports", path: (id) => `/projects/${id}/inspections` },
  { key: "snags", label: "Snag List", path: (id) => `/projects/${id}/snags` },
  { key: "audit", label: "Audit Trail", path: (id) => `/projects/${id}/audit` }
];

export function ProjectTabsNav(props: { projectId: string }) {
  const pathname = usePathname();

  return (
    <div className="dd-card overflow-x-auto px-2 py-2">
      <div className="flex items-center gap-1 min-w-max">
        {TABS.map((t) => {
          const href = t.path(props.projectId);
          const active =
            pathname === href ||
            (t.key !== "overview" && pathname.startsWith(`${href}/`)) ||
            (t.key === "overview" && pathname === `/projects/${props.projectId}`);

          return (
            <Link
              key={t.key}
              href={href}
              className={clsx(
                "px-3 py-2 rounded-lg text-sm font-semibold transition-colors",
                active
                  ? "bg-brand-shell text-white shadow-sm ring-1 ring-brand-accent/55"
                  : "text-brand-secondary hover:bg-brand-accent/10 hover:text-brand-primary"
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
