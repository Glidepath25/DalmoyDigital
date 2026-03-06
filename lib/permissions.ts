export const PERMISSIONS = {
  adminAccess: "admin:access",
  usersManage: "users:manage",
  lookupsManage: "lookups:manage",
  projectsRead: "projects:read",
  projectsCreate: "projects:create",
  projectsUpdate: "projects:update"
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

