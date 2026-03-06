import Link from "next/link";

import { requirePermission } from "@/lib/auth/guards";
import { getSession } from "@/lib/auth/session";

export default async function AdminHomePage() {
  await requirePermission("admin:access");
  const session = await getSession();

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-semibold text-slate-900">Admin</h1>
        <p className="text-slate-600 mt-1">Signed in as {session?.user?.email}</p>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link className="rounded-lg border bg-white p-4 hover:bg-slate-50" href="/admin/projects">
            Projects
          </Link>
          <Link className="rounded-lg border bg-white p-4 hover:bg-slate-50" href="/admin/users">
            Users
          </Link>
          <Link className="rounded-lg border bg-white p-4 hover:bg-slate-50" href="/admin/clients">
            Clients
          </Link>
          <Link className="rounded-lg border bg-white p-4 hover:bg-slate-50" href="/admin/statuses">
            Project Statuses
          </Link>
          <Link className="rounded-lg border bg-white p-4 hover:bg-slate-50" href="/admin/lookups">
            Lookup Values
          </Link>
        </div>
      </div>
    </main>
  );
}
