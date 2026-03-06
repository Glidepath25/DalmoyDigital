import { PrismaClient } from "@prisma/client";

import { hashPassword } from "../lib/password";
import { DEFAULT_PROGRAMME_MILESTONES } from "../lib/project-workspace/milestones";
import { storeLocalBuffer } from "../lib/storage/local";

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

async function upsertLookupType(params: { key: string; name: string; description?: string; createdById: string; updatedById: string }) {
  return db.lookupType.upsert({
    where: { key: params.key },
    update: {
      name: params.name,
      description: params.description ?? null,
      isActive: true,
      archivedAt: null,
      updatedById: params.updatedById
    },
    create: {
      key: params.key,
      name: params.name,
      description: params.description ?? null,
      isActive: true,
      createdById: params.createdById,
      updatedById: params.updatedById
    }
  });
}

async function upsertLookupOption(params: {
  lookupTypeId: string;
  label: string;
  value: string;
  sortOrder: number;
  createdById: string;
  updatedById: string;
}) {
  return db.lookupOption.upsert({
    where: { lookupTypeId_value: { lookupTypeId: params.lookupTypeId, value: params.value } },
    update: {
      label: params.label,
      sortOrder: params.sortOrder,
      isActive: true,
      archivedAt: null,
      updatedById: params.updatedById
    },
    create: {
      lookupTypeId: params.lookupTypeId,
      label: params.label,
      value: params.value,
      sortOrder: params.sortOrder,
      isActive: true,
      createdById: params.createdById,
      updatedById: params.updatedById
    }
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
      name: "Acme Retail \u2022 Store Refurb",
      clientId: clientA.id,
      statusId: stCosting.id
    },
    {
      reference: "DD-0002",
      name: "Northside Offices \u2022 3rd Floor Fitout",
      clientId: clientB.id,
      statusId: stInProgress.id
    },
    {
      reference: "DD-0003",
      name: "Dalmoy Demo \u2022 Reception Area",
      clientId: clientC.id,
      statusId: stSnagging.id
    },
    {
      reference: "DD-0004",
      name: "Acme Retail \u2022 Back of House Upgrade",
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

  // Workspace lookups (admin-managed dropdowns)
  const ragType = await upsertLookupType({
    key: "project_rag",
    name: "Project RAG",
    description: "Red/Amber/Green project health indicator",
    createdById: adminUser.id,
    updatedById: adminUser.id
  });
  const actionStatusType = await upsertLookupType({
    key: "action_status",
    name: "Action status",
    description: "Status values for critical action items",
    createdById: adminUser.id,
    updatedById: adminUser.id
  });
  const actionPriorityType = await upsertLookupType({
    key: "action_priority",
    name: "Action priority",
    description: "Priority values for critical action items",
    createdById: adminUser.id,
    updatedById: adminUser.id
  });
  const attachmentCategoryType = await upsertLookupType({
    key: "attachment_category",
    name: "Attachment category",
    description: "Attachment categories for project document uploads",
    createdById: adminUser.id,
    updatedById: adminUser.id
  });

  const [ragGreen, ragAmber, ragRed] = await Promise.all([
    upsertLookupOption({
      lookupTypeId: ragType.id,
      label: "Green",
      value: "green",
      sortOrder: 10,
      createdById: adminUser.id,
      updatedById: adminUser.id
    }),
    upsertLookupOption({
      lookupTypeId: ragType.id,
      label: "Amber",
      value: "amber",
      sortOrder: 20,
      createdById: adminUser.id,
      updatedById: adminUser.id
    }),
    upsertLookupOption({
      lookupTypeId: ragType.id,
      label: "Red",
      value: "red",
      sortOrder: 30,
      createdById: adminUser.id,
      updatedById: adminUser.id
    })
  ]);

  const [actOpen, actInProgress, actBlocked, actClosed] = await Promise.all([
    upsertLookupOption({
      lookupTypeId: actionStatusType.id,
      label: "Open",
      value: "open",
      sortOrder: 10,
      createdById: adminUser.id,
      updatedById: adminUser.id
    }),
    upsertLookupOption({
      lookupTypeId: actionStatusType.id,
      label: "In Progress",
      value: "in_progress",
      sortOrder: 20,
      createdById: adminUser.id,
      updatedById: adminUser.id
    }),
    upsertLookupOption({
      lookupTypeId: actionStatusType.id,
      label: "Blocked",
      value: "blocked",
      sortOrder: 30,
      createdById: adminUser.id,
      updatedById: adminUser.id
    }),
    upsertLookupOption({
      lookupTypeId: actionStatusType.id,
      label: "Closed",
      value: "closed",
      sortOrder: 40,
      createdById: adminUser.id,
      updatedById: adminUser.id
    })
  ]);

  const [prioLow, prioMedium, prioHigh, prioCritical] = await Promise.all([
    upsertLookupOption({
      lookupTypeId: actionPriorityType.id,
      label: "Low",
      value: "low",
      sortOrder: 10,
      createdById: adminUser.id,
      updatedById: adminUser.id
    }),
    upsertLookupOption({
      lookupTypeId: actionPriorityType.id,
      label: "Medium",
      value: "medium",
      sortOrder: 20,
      createdById: adminUser.id,
      updatedById: adminUser.id
    }),
    upsertLookupOption({
      lookupTypeId: actionPriorityType.id,
      label: "High",
      value: "high",
      sortOrder: 30,
      createdById: adminUser.id,
      updatedById: adminUser.id
    }),
    upsertLookupOption({
      lookupTypeId: actionPriorityType.id,
      label: "Critical",
      value: "critical",
      sortOrder: 40,
      createdById: adminUser.id,
      updatedById: adminUser.id
    })
  ]);

  const [catDrawings, catPhotos, catRfi, catHandover] = await Promise.all([
    upsertLookupOption({
      lookupTypeId: attachmentCategoryType.id,
      label: "Drawings",
      value: "drawings",
      sortOrder: 10,
      createdById: adminUser.id,
      updatedById: adminUser.id
    }),
    upsertLookupOption({
      lookupTypeId: attachmentCategoryType.id,
      label: "Site Photos",
      value: "site_photos",
      sortOrder: 20,
      createdById: adminUser.id,
      updatedById: adminUser.id
    }),
    upsertLookupOption({
      lookupTypeId: attachmentCategoryType.id,
      label: "RFI",
      value: "rfi",
      sortOrder: 30,
      createdById: adminUser.id,
      updatedById: adminUser.id
    }),
    upsertLookupOption({
      lookupTypeId: attachmentCategoryType.id,
      label: "Handover",
      value: "handover",
      sortOrder: 40,
      createdById: adminUser.id,
      updatedById: adminUser.id
    })
  ]);

  const projects = await db.project.findMany({ orderBy: [{ reference: "asc" }] });
  const managerUser = userByEmail.get("manager@dalmoy.local") ?? adminUser;

  for (const p of projects) {
    const milestoneCount = await db.projectMilestone.count({ where: { projectId: p.id } });
    if (milestoneCount === 0) {
      await db.projectMilestone.createMany({
        data: DEFAULT_PROGRAMME_MILESTONES.map((m) => ({
          projectId: p.id,
          milestoneKey: m.key,
          milestoneName: m.name,
          sortOrder: m.sortOrder,
          ragOptionId: p.reference === "DD-0003" ? ragAmber.id : p.reference === "DD-0002" ? ragGreen.id : null,
          createdById: adminUser.id,
          updatedById: adminUser.id
        }))
      });
    }

    await db.project.update({
      where: { id: p.id },
      data: {
        ragOptionId:
          p.reference === "DD-0003"
            ? ragAmber.id
            : p.reference === "DD-0004"
              ? ragGreen.id
              : p.reference === "DD-0002"
                ? ragGreen.id
                : ragAmber.id,
        seniorManagerUserId: adminUser.id,
        siteManagerUserId: managerUser.id,
        contractManagerUserId: managerUser.id,
        updatedById: adminUser.id
      }
    });

    const corrCount = await db.projectCorrespondence.count({ where: { projectId: p.id } });
    if (corrCount === 0) {
      await db.projectCorrespondence.createMany({
        data: [
          {
            projectId: p.id,
            fromAddress: "client@example.com",
            toAddress: "dalmoy@dalmoy.local",
            subject: `Kickoff: ${p.reference}`,
            bodyText: "Please confirm mobilisation date and point of contact.",
            aiSummary: "Client requested confirmation of mobilisation date and key contact.",
            occurredAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
            sourceType: "manual",
            provider: "manual",
            createdById: adminUser.id
          },
          {
            projectId: p.id,
            fromAddress: "dalmoy@dalmoy.local",
            toAddress: "client@example.com",
            subject: `Re: Kickoff: ${p.reference}`,
            bodyText: "Mobilisation planned for next Monday. Site manager assigned.",
            aiSummary: "Dalmoy confirmed mobilisation date and assigned site manager.",
            occurredAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1),
            sourceType: "manual",
            provider: "manual",
            createdById: managerUser.id
          }
        ]
      });
    }

    const actionCount = await db.projectActionItem.count({ where: { projectId: p.id } });
    if (actionCount === 0) {
      await db.projectActionItem.createMany({
        data: [
          {
            projectId: p.id,
            title: "Confirm access hours and loading bay requirements",
            statusOptionId: actOpen.id,
            priorityOptionId: prioHigh.id,
            ownerUserId: managerUser.id,
            requiredClosureDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3),
            createdById: adminUser.id,
            updatedById: adminUser.id
          },
          {
            projectId: p.id,
            title: "Issue programme draft for sign-off",
            statusOptionId: actInProgress.id,
            priorityOptionId: prioMedium.id,
            ownerUserId: adminUser.id,
            requiredClosureDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
            createdById: adminUser.id,
            updatedById: adminUser.id
          }
        ]
      });
    }

    const financeCount = await db.projectFinanceLine.count({ where: { projectId: p.id } });
    if (financeCount === 0) {
      await db.projectFinanceLine.createMany({
        data: [
          {
            projectId: p.id,
            item: "Partitioning & Studwork",
            supplier: "Fitout Supplies Ltd",
            tenderedCost: "12000.00",
            qty: "1.00",
            actualCost: "11850.00",
            invoicedCost: "15000.00",
            createdById: adminUser.id,
            updatedById: adminUser.id
          },
          {
            projectId: p.id,
            item: "Ceiling & Lighting",
            supplier: "Brightline Electrical",
            tenderedCost: "9000.00",
            qty: "1.00",
            actualCost: "8700.00",
            invoicedCost: "11000.00",
            createdById: adminUser.id,
            updatedById: adminUser.id
          }
        ]
      });
    }

    const reportCount = await db.siteInspectionReport.count({ where: { projectId: p.id } });
    if (reportCount === 0) {
      const report = await db.siteInspectionReport.create({
        data: {
          projectId: p.id,
          completedByUserId: managerUser.id,
          inspectionDate: new Date(Date.now() - 1000 * 60 * 60 * 24),
          projectReferenceSnapshot: p.reference
        }
      });
      await db.siteInspectionItem.createMany({
        data: [
          {
            reportId: report.id,
            itemTitle: "Fire doors installed and tagged",
            comment: "Labels present, check closers next visit."
          }
        ]
      });
    }
  }

  const firstProject = projects[0];
  if (firstProject) {
    const existing = await db.projectAttachment.count({ where: { projectId: firstProject.id } });
    if (existing === 0) {
      const demo = await storeLocalBuffer({
        originalName: "dalmoy-demo-attachment.txt",
        buffer: Buffer.from("Dalmoy Digital demo attachment.\n", "utf8"),
        prefix: "demo"
      });

      const stored = await db.storedFile.create({
        data: {
          storageProvider: demo.storageProvider,
          storageKey: demo.storageKey,
          originalName: "dalmoy-demo-attachment.txt",
          mimeType: "text/plain",
          sizeBytes: demo.sizeBytes,
          uploadedById: adminUser.id
        }
      });

      await db.projectAttachment.create({
        data: {
          projectId: firstProject.id,
          fileId: stored.id,
          categoryOptionId: catDrawings.id,
          uploadedById: adminUser.id
        }
      });
    }
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
