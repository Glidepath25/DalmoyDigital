import Link from "next/link";

import { DalmoyLogo } from "@/components/brand/dalmoy-logo";
import { Card } from "@/components/ui/card";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-app-bg flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <div className="p-6">
          <DalmoyLogo className="mb-4" size="sm" surface="light" />
          <h1 className="text-xl font-semibold text-brand-primary">Not found</h1>
          <p className="mt-1 text-brand-secondary">The page you requested does not exist.</p>
          <Link className="dd-link mt-4 inline-block" href="/dashboard">
            Back to dashboard
          </Link>
        </div>
      </Card>
    </main>
  );
}

