import Link from "next/link";

import { AdminNav } from "@/components/app/admin-nav";
import { AppShell } from "@/components/app/app-shell";
import { SectionCard } from "@/components/app/section-card";
import { requirePermission } from "@/lib/auth/guards";
import { getSession } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/permissions";

export default async function AdminHomePage() {
  await requirePermission(PERMISSIONS.adminAccess);
  const session = await getSession();

  return (
    <AppShell subtitle={`Signed in as ${session?.user?.email ?? ""}`} title="Admin control centre">
      <AdminNav active="home" />

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SectionCard subtitle="Create projects and manage delivery." title="Projects">
          <Link className="dd-link" href="/admin/projects">
            Open project admin ->
          </Link>
        </SectionCard>
        <SectionCard subtitle="Access levels and account security." title="Users & roles">
          <Link className="dd-link" href="/admin/users">
            Manage users ->
          </Link>
        </SectionCard>
        <SectionCard subtitle="Dropdown values used throughout the platform." title="Lookups">
          <div className="space-y-2">
            <Link className="dd-link block" href="/admin/clients">
              Clients ->
            </Link>
            <Link className="dd-link block" href="/admin/statuses">
              Project statuses ->
            </Link>
            <Link className="dd-link block" href="/admin/lookups">
              Generic lookup types/options ->
            </Link>
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}

