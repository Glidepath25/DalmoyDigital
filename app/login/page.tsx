"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import type { FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

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
    <main className="min-h-screen bg-app-bg flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <div className="p-6">
          <h1 className="text-2xl font-semibold tracking-tight text-brand-primary">
            Dalmoy <span className="text-brand-secondary font-semibold">Digital</span>
          </h1>
          <p className="text-brand-secondary mt-1">Sign in to continue</p>

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
    </main>
  );
}
