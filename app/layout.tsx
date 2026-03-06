import "./globals.css";

import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import type React from "react";

import { Providers } from "@/app/providers";
import { authOptions } from "@/lib/auth/options";

export const metadata: Metadata = {
  title: "Dalmoy Digital",
  description: "Project tracking platform for construction fitout projects"
};

export default async function RootLayout(props: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en">
      <body>
        <Providers session={session}>{props.children}</Providers>
      </body>
    </html>
  );
}
