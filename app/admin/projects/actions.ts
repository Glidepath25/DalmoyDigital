"use server";

import { createProject } from "@/lib/actions/projects";

export async function createProjectAdmin(formData: FormData) {
  return createProject("admin", formData);
}
