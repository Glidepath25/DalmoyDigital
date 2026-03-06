import Link from "next/link";
import type React from "react";

import { SignOutButton } from "@/components/app/signout-button";
import { requireSession } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/permissions";
import { hasPermission } from "@/lib/rbac";

export async function AppShell(props: { title: string; children: React.ReactNode }) {
  const session = await requireSession();
  const userId = session.user.id;
  const canAdmin = await hasPermission(userId, PERMISSIONS.adminAccess);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link className="font-semibold text-slate-900" href="/dashboard">
              Dalmoy Digital
            </Link>
            <nav className="flex items-center gap-3 text-sm text-slate-700">
              <Link className="hover:text-slate-900" href="/dashboard">
                Dashboard
              </Link>
              {canAdmin ? (
                <Link className="hover:text-slate-900" href="/admin">
                  Admin
                </Link>
              ) : null}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600 hidden sm:block">{session.user.email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="p-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-semibold text-slate-900">{props.title}</h1>
          <div className="mt-6">{props.children}</div>
        </div>
      </main>
    </div>
  );
}
