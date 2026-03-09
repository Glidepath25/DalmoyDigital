import Link from "next/link";
import type React from "react";

import { MainNav } from "@/components/app/main-nav";
import { SignOutButton } from "@/components/app/signout-button";
import { PageHeader } from "@/components/app/page-header";
import { DalmoyLogo } from "@/components/brand/dalmoy-logo";
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
      <header className="sticky top-0 z-40 border-b border-brand-shellElevated bg-brand-shell text-brand-foreground shadow-[0_6px_24px_rgba(0,0,0,0.22)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3 md:px-8">
          <div className="flex items-center gap-4">
            <Link className="inline-flex items-center" href="/dashboard">
              <DalmoyLogo size="sm" surface="dark" />
            </Link>
            <MainNav canAdmin={canAdmin} />
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-brand-foreground/80 sm:block">{session.user.email}</span>
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
