"use client";

import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";
import type React from "react";

export function Providers(props: { children: React.ReactNode; session?: Session | null }) {
  return <SessionProvider session={props.session}>{props.children}</SessionProvider>;
}
