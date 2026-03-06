import { PrismaClient } from "@prisma/client";

import { hashPassword } from "../lib/password";

const db = new PrismaClient();

async function upsertPermission(key: string, description: string) {
  return db.permission.upsert({
    where: { key },
    update: { description },
    create: { key, description }
  });
}

async function upsertRole(key: string, name: string, description: string) {
  return db.role.upsert({
    where: { key },
    update: { name, description, isSystem: true },
    create: { key, name, description, isSystem: true }
  });
}

async function main() {
  const permissions = await Promise.all([
    upsertPermission("admin:access", "Access admin area"),
    upsertPermission("users:manage", "Create/disable users and assign roles"),
    upsertPermission("lookups:manage", "Manage dropdown/lookup values"),
    upsertPermission("projects:read", "View projects"),
    upsertPermission("projects:create", "Create projects"),
    upsertPermission("projects:update", "Edit projects")
  ]);

  const roles = await Promise.all([
    upsertRole("admin", "Admin", "Full system access"),
    upsertRole("manager", "Manager", "Manage projects"),
    upsertRole("standard_user", "Standard User", "Standard access"),
    upsertRole("read_only", "Read Only User", "View-only access")
  ]);

  const permissionByKey = new Map(permissions.map((p) => [p.key, p]));
  const roleByKey = new Map(roles.map((r) => [r.key, r]));

  const rolePermissions: Array<{ roleKey: string; permissionKey: string }> = [
    // Admin
    { roleKey: "admin", permissionKey: "admin:access" },
    { roleKey: "admin", permissionKey: "users:manage" },
    { roleKey: "admin", permissionKey: "lookups:manage" },
    { roleKey: "admin", permissionKey: "projects:read" },
    { roleKey: "admin", permissionKey: "projects:create" },
    { roleKey: "admin", permissionKey: "projects:update" },
    // Manager
    { roleKey: "manager", permissionKey: "projects:read" },
    { roleKey: "manager", permissionKey: "projects:create" },
    { roleKey: "manager", permissionKey: "projects:update" },
    // Standard User
    { roleKey: "standard_user", permissionKey: "projects:read" },
    { roleKey: "standard_user", permissionKey: "projects:update" },
    // Read-only
    { roleKey: "read_only", permissionKey: "projects:read" }
  ];

  for (const rp of rolePermissions) {
    const role = roleByKey.get(rp.roleKey);
    const perm = permissionByKey.get(rp.permissionKey);
    if (!role || !perm) continue;
    await db.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: role.id,
          permissionId: perm.id
        }
      },
      update: {},
      create: { roleId: role.id, permissionId: perm.id }
    });
  }

  const adminPasswordHash = await hashPassword("Admin123!");
  const managerPasswordHash = await hashPassword("Manager123!");
  const userPasswordHash = await hashPassword("User12345!");
  const readonlyPasswordHash = await hashPassword("ReadOnly123!");

  const adminUser = await db.user.upsert({
    where: { email: "admin@dalmoy.local" },
    update: { name: "Admin", passwordHash: adminPasswordHash, isActive: true },
    create: { email: "admin@dalmoy.local", name: "Admin", passwordHash: adminPasswordHash, isActive: true }
  });

  const users = await Promise.all([
    db.user.upsert({
      where: { email: "manager@dalmoy.local" },
      update: { name: "Manager", passwordHash: managerPasswordHash, isActive: true },
      create: {
        email: "manager@dalmoy.local",
        name: "Manager",
        passwordHash: managerPasswordHash,
        isActive: true
      }
    }),
    db.user.upsert({
      where: { email: "user@dalmoy.local" },
      update: { name: "Standard User", passwordHash: userPasswordHash, isActive: true },
      create: {
        email: "user@dalmoy.local",
        name: "Standard User",
        passwordHash: userPasswordHash,
        isActive: true
      }
    }),
    db.user.upsert({
      where: { email: "readonly@dalmoy.local" },
      update: { name: "Read Only", passwordHash: readonlyPasswordHash, isActive: true },
      create: {
        email: "readonly@dalmoy.local",
        name: "Read Only",
        passwordHash: readonlyPasswordHash,
        isActive: true
      }
    })
  ]);

  const userByEmail = new Map([adminUser, ...users].map((u) => [u.email, u]));

  const userRoleAssignments: Array<{ email: string; roleKey: string }> = [
    { email: "admin@dalmoy.local", roleKey: "admin" },
    { email: "manager@dalmoy.local", roleKey: "manager" },
    { email: "user@dalmoy.local", roleKey: "standard_user" },
    { email: "readonly@dalmoy.local", roleKey: "read_only" }
  ];

  for (const ura of userRoleAssignments) {
    const user = userByEmail.get(ura.email);
    const role = roleByKey.get(ura.roleKey);
    if (!user || !role) continue;
    await db.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: role.id } },
      update: {},
      create: { userId: user.id, roleId: role.id }
    });
  }

  const [clientA, clientB, clientC] = await Promise.all([
    db.client.upsert({
      where: { id: "00000000-0000-0000-0000-0000000000a1" },
      update: { name: "Acme Retail", sortOrder: 10, isActive: true, archivedAt: null },
      create: {
        id: "00000000-0000-0000-0000-0000000000a1",
        name: "Acme Retail",
        sortOrder: 10,
        isActive: true,
        createdById: adminUser.id,
        updatedById: adminUser.id
      }
    }),
    db.client.upsert({
      where: { id: "00000000-0000-0000-0000-0000000000a2" },
      update: { name: "Northside Offices", sortOrder: 20, isActive: true, archivedAt: null },
      create: {
        id: "00000000-0000-0000-0000-0000000000a2",
        name: "Northside Offices",
        sortOrder: 20,
        isActive: true,
        createdById: adminUser.id,
        updatedById: adminUser.id
      }
    }),
    db.client.upsert({
      where: { id: "00000000-0000-0000-0000-0000000000a3" },
      update: { name: "Dalmoy Demo Client", sortOrder: 30, isActive: true, archivedAt: null },
      create: {
        id: "00000000-0000-0000-0000-0000000000a3",
        name: "Dalmoy Demo Client",
        sortOrder: 30,
        isActive: true,
        createdById: adminUser.id,
        updatedById: adminUser.id
      }
    })
  ]);

  const [stCosting, stInProgress, stSnagging, stComplete] = await Promise.all([
    db.projectStatus.upsert({
      where: { id: "00000000-0000-0000-0000-0000000000b1" },
      update: { name: "Costing", sortOrder: 10, isActive: true, archivedAt: null },
      create: {
        id: "00000000-0000-0000-0000-0000000000b1",
        name: "Costing",
        sortOrder: 10,
        isActive: true,
        createdById: adminUser.id,
        updatedById: adminUser.id
      }
    }),
    db.projectStatus.upsert({
      where: { id: "00000000-0000-0000-0000-0000000000b2" },
      update: { name: "In Progress", sortOrder: 20, isActive: true, archivedAt: null },
      create: {
        id: "00000000-0000-0000-0000-0000000000b2",
        name: "In Progress",
        sortOrder: 20,
        isActive: true,
        createdById: adminUser.id,
        updatedById: adminUser.id
      }
    }),
    db.projectStatus.upsert({
      where: { id: "00000000-0000-0000-0000-0000000000b3" },
      update: { name: "Snagging", sortOrder: 30, isActive: true, archivedAt: null },
      create: {
        id: "00000000-0000-0000-0000-0000000000b3",
        name: "Snagging",
        sortOrder: 30,
        isActive: true,
        createdById: adminUser.id,
        updatedById: adminUser.id
      }
    }),
    db.projectStatus.upsert({
      where: { id: "00000000-0000-0000-0000-0000000000b4" },
      update: { name: "Complete", sortOrder: 40, isActive: true, archivedAt: null },
      create: {
        id: "00000000-0000-0000-0000-0000000000b4",
        name: "Complete",
        sortOrder: 40,
        isActive: true,
        createdById: adminUser.id,
        updatedById: adminUser.id
      }
    })
  ]);

  const demoProjects = [
    {
      reference: "DD-0001",
      name: "Acme Retail • Store Refurb",
      clientId: clientA.id,
      statusId: stCosting.id
    },
    {
      reference: "DD-0002",
      name: "Northside Offices • 3rd Floor Fitout",
      clientId: clientB.id,
      statusId: stInProgress.id
    },
    {
      reference: "DD-0003",
      name: "Dalmoy Demo • Reception Area",
      clientId: clientC.id,
      statusId: stSnagging.id
    },
    {
      reference: "DD-0004",
      name: "Acme Retail • Back of House Upgrade",
      clientId: clientA.id,
      statusId: stComplete.id
    }
  ];

  for (const p of demoProjects) {
    await db.project.upsert({
      where: { reference: p.reference },
      update: {
        name: p.name,
        clientId: p.clientId,
        statusId: p.statusId,
        updatedById: adminUser.id
      },
      create: {
        reference: p.reference,
        name: p.name,
        clientId: p.clientId,
        statusId: p.statusId,
        notes: "Seeded demo project.",
        dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 21),
        createdById: adminUser.id,
        updatedById: adminUser.id
      }
    });
  }

  // Example generic lookup for future modules
  const snagType = await db.lookupType.upsert({
    where: { key: "snag_severity" },
    update: { name: "Snag severity", description: "Example lookup for future snagging module" },
    create: {
      key: "snag_severity",
      name: "Snag severity",
      description: "Example lookup for future snagging module",
      createdById: adminUser.id,
      updatedById: adminUser.id
    }
  });

  const severities = [
    { label: "Low", value: "low", sortOrder: 10 },
    { label: "Medium", value: "medium", sortOrder: 20 },
    { label: "High", value: "high", sortOrder: 30 }
  ];

  for (const s of severities) {
    await db.lookupOption.upsert({
      where: { lookupTypeId_value: { lookupTypeId: snagType.id, value: s.value } },
      update: { label: s.label, sortOrder: s.sortOrder, isActive: true, archivedAt: null },
      create: {
        lookupTypeId: snagType.id,
        label: s.label,
        value: s.value,
        sortOrder: s.sortOrder,
        isActive: true,
        createdById: adminUser.id,
        updatedById: adminUser.id
      }
    });
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });

