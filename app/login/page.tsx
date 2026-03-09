"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import type { FormEvent } from "react";

import { DalmoyLogo } from "@/components/brand/dalmoy-logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { dalmoyBrand } from "@/lib/brand/tokens";

export default function LoginPage() {
  const router = useRouter();
  const search = useSearchParams();
  const callbackUrl = useMemo(() => search.get("callbackUrl") ?? "/dashboard", [search]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl
      });

      if (!result || result.error) {
        setError("Invalid email or password.");
        return;
      }

      router.push(result.url ?? "/dashboard");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-app-bg">
      <div className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 lg:grid-cols-2">
        <section className="hidden flex-col justify-between bg-brand-shell px-10 py-10 text-brand-foreground lg:flex">
          <div>
            <DalmoyLogo priority size="lg" surface="dark" />
            <p className="mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">Internal Platform</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">Dalmoy Project Delivery</h1>
            <p className="mt-3 max-w-md text-sm leading-6 text-brand-foreground/80">{dalmoyBrand.messaging.strapline}</p>
          </div>
          <p className="text-xs text-brand-foreground/65">Secure access for Dalmoy teams managing projects across Ireland.</p>
        </section>

        <section className="flex items-center justify-center p-6 md:p-10">
          <Card className="w-full max-w-md">
            <div className="p-6">
              <DalmoyLogo className="mb-4" size="md" surface="light" />
              <h2 className="text-xl font-semibold tracking-tight text-brand-primary">Sign in</h2>
              <p className="mt-1 text-sm text-brand-secondary">Access the Dalmoy internal delivery platform.</p>

              <form className="mt-6 space-y-4" onSubmit={onSubmit}>
                <div>
                  <label className="text-sm font-semibold text-brand-secondary">Email</label>
                  <Input
                    autoComplete="email"
                    className="mt-1"
                    name="email"
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    type="email"
                    value={email}
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-brand-secondary">Password</label>
                  <Input
                    autoComplete="current-password"
                    className="mt-1"
                    name="password"
                    onChange={(e) => setPassword(e.target.value)}
                    type="password"
                    value={password}
                  />
                </div>
                {error ? <p className="text-sm font-semibold text-semantic-danger">{error}</p> : null}
                <Button className="w-full" disabled={loading} type="submit">
                  {loading ? "Signing in..." : "Sign in"}
                </Button>
              </form>
            </div>
          </Card>
        </section>
      </div>
    </main>
  );
}
