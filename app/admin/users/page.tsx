import { AppShell } from "@/components/app/app-shell";
import { AdminNav } from "@/components/app/admin-nav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requirePermission } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";

import { createUser, updateUser } from "./actions";

type PageProps = { searchParams?: Record<string, string | string[] | undefined> };

function toString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminUsersPage(props: PageProps) {
  await requirePermission(PERMISSIONS.adminAccess);
  await requirePermission(PERMISSIONS.usersManage);

  const saved = toString(props.searchParams?.saved) === "1";
  const error = toString(props.searchParams?.error);

  const [roles, users] = await Promise.all([
    db.role.findMany({ orderBy: [{ name: "asc" }] }),
    db.user.findMany({
      orderBy: [{ email: "asc" }],
      include: { roles: { include: { role: true } } }
    })
  ]);

  const roleMap = new Map(roles.map((r) => [r.id, r]));

  return (
    <AppShell title="Admin • Users">
      <AdminNav active="users" />
      {saved ? <p className="mt-4 text-sm font-semibold text-semantic-success">Saved.</p> : null}
      {error ? <p className="mt-2 text-sm font-semibold text-semantic-danger">Error: {error}</p> : null}

      <Card className="p-4">
        <h2 className="text-sm font-semibold text-brand-primary">Add user</h2>
        <form action={createUser} className="mt-3 grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-4">
            <label className="text-xs font-semibold text-brand-secondary">Email</label>
            <Input className="mt-1" name="email" placeholder="user@company.com" type="email" />
          </div>
          <div className="md:col-span-3">
            <label className="text-xs font-semibold text-brand-secondary">Name</label>
            <Input className="mt-1" name="name" placeholder="Full name" />
          </div>
          <div className="md:col-span-3">
            <label className="text-xs font-semibold text-brand-secondary">Password</label>
            <Input className="mt-1" name="password" type="password" />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-brand-secondary">Role(s)</label>
            <div className="mt-2 space-y-1">
              {roles.map((r) => (
                <label className="flex items-center gap-2 text-xs font-semibold text-brand-secondary" key={r.id}>
                  <input name="roleIds" type="checkbox" value={r.id} />
                  {r.name}
                </label>
              ))}
            </div>
          </div>
          <div className="md:col-span-12">
            <Button type="submit">Create user</Button>
          </div>
        </form>
      </Card>

      <div className="mt-4 space-y-3">
        {users.map((u) => {
          const assignedRoleIds = new Set(u.roles.map((ur) => ur.roleId));
          return (
            <Card className="p-4" key={u.id}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-slate-900">{u.email}</p>
                  <p className="text-xs text-slate-600 mt-1">
                    Roles:{" "}
                    {u.roles.length
                      ? u.roles
                          .map((ur) => roleMap.get(ur.roleId)?.name ?? ur.role.key)
                          .sort()
                          .join(", ")
                      : "—"}
                  </p>
                </div>
                <div className="text-xs text-slate-600">{u.isActive ? "Active" : "Disabled"}</div>
              </div>

              <form action={updateUser.bind(null, u.id)} className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="md:col-span-4">
                  <label className="text-xs font-medium text-slate-700">Name</label>
                  <Input className="mt-1" defaultValue={u.name ?? ""} name="name" placeholder="Full name" />
                </div>
                <div className="md:col-span-3">
                  <label className="text-xs font-medium text-slate-700">New password (optional)</label>
                  <Input className="mt-1" name="password" type="password" />
                </div>
                <div className="md:col-span-3 flex items-end">
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input defaultChecked={u.isActive} name="isActive" type="checkbox" value="true" />
                    Active
                  </label>
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-medium text-slate-700">Role(s)</label>
                  <div className="mt-2 space-y-1">
                    {roles.map((r) => (
                      <label className="flex items-center gap-2 text-xs text-slate-700" key={r.id}>
                        <input defaultChecked={assignedRoleIds.has(r.id)} name="roleIds" type="checkbox" value={r.id} />
                        {r.name}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="md:col-span-12">
                  <Button type="submit" variant="secondary">
                    Save changes
                  </Button>
                </div>
              </form>
            </Card>
          );
        })}

        {users.length === 0 ? <p className="text-sm text-slate-600">No users yet.</p> : null}
      </div>
    </AppShell>
  );
}
