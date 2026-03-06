import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth/options";

export async function getSession() {
  return getServerSession(authOptions);
}

export async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  return session;
}

export async function requireUserId() {
  const session = await requireSession();
  return session.user.id;
}

