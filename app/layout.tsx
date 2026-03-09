import "./globals.css";

import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { getServerSession } from "next-auth";
import type React from "react";

import { Providers } from "@/app/providers";
import { authOptions } from "@/lib/auth/options";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap"
});

export const metadata: Metadata = {
  title: "Dalmoy Digital",
  description: "Project tracking platform for construction fitout projects"
};

export default async function RootLayout(props: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  return (
    <html className={poppins.variable} lang="en">
      <body className="font-sans">
        <Providers session={session}>{props.children}</Providers>
      </body>
    </html>
  );
}
