import Link from "next/link";

import { Card } from "@/components/ui/card";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <div className="p-6">
          <h1 className="text-xl font-semibold text-slate-900">Not found</h1>
          <p className="text-slate-600 mt-1">The page you requested doesn’t exist.</p>
          <Link className="mt-4 inline-block text-sm text-blue-700 hover:underline" href="/dashboard">
            Back to dashboard
          </Link>
        </div>
      </Card>
    </main>
  );
}

