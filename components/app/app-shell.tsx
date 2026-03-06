import Link from "next/link";
import type React from "react";

import { SignOutButton } from "@/components/app/signout-button";
import { PageHeader } from "@/components/app/page-header";
import { requireSession } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/permissions";
import { hasPermission } from "@/lib/rbac";

export async function AppShell(props: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const session = await requireSession();
  const userId = session.user.id;
  const canAdmin = await hasPermission(userId, PERMISSIONS.adminAccess);

  return (
    <div className="min-h-screen bg-app-bg">
      <header className="border-b border-app-border bg-white">
        <div className="max-w-7xl mx-auto px-5 md:px-8 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link className="font-semibold tracking-tight text-brand-primary" href="/dashboard">
              <span className="text-base">Dalmoy</span>{" "}
              <span className="text-base text-brand-secondary font-semibold">Digital</span>
            </Link>
            <nav className="flex items-center gap-2 text-sm text-brand-secondary">
              <Link className="rounded-md px-2.5 py-1.5 hover:bg-app-bg hover:text-brand-primary" href="/dashboard">
                Dashboard
              </Link>
              {canAdmin ? (
                <Link className="rounded-md px-2.5 py-1.5 hover:bg-app-bg hover:text-brand-primary" href="/admin">
                  Admin
                </Link>
              ) : null}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-brand-secondary hidden sm:block">{session.user.email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="px-5 md:px-8 py-6">
        <div className="max-w-7xl mx-auto">
          <PageHeader actions={props.actions} subtitle={props.subtitle} title={props.title} />
          <div className="mt-6">{props.children}</div>
        </div>
      </main>
    </div>
  );
}
