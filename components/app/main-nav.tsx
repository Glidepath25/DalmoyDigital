"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

export function MainNav(props: { canAdmin: boolean }) {
  const pathname = usePathname();
  const items = [
    { href: "/dashboard", label: "Dashboard", match: pathname.startsWith("/dashboard") || pathname.startsWith("/projects") },
    { href: "/admin", label: "Admin", match: pathname.startsWith("/admin"), hidden: !props.canAdmin }
  ];

  return (
    <nav className="flex items-center gap-1 rounded-xl border border-white/10 bg-brand-shellElevated/80 p-1">
      {items
        .filter((item) => !item.hidden)
        .map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              "rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors",
              item.match
                ? "bg-brand-accent text-white"
                : "text-brand-foreground/80 hover:bg-white/10 hover:text-white"
            )}
          >
            {item.label}
          </Link>
        ))}
    </nav>
  );
}

