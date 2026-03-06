import Link from "next/link";
import { format } from "date-fns";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/app/page-header";
import { SectionCard } from "@/components/app/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requirePermission } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";

import { createInspectionReport } from "../actions";

type PageProps = { params: { projectId: string }; searchParams?: Record<string, string | string[] | undefined> };

function toString(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export default async function NewInspectionPage(props: PageProps) {
  await requirePermission(PERMISSIONS.projectsRead);

  const project = await db.project.findUnique({ where: { id: props.params.projectId } });
  if (!project) notFound();

  const error = toString(props.searchParams?.error);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <PageHeader title="Complete site inspection" subtitle={`Project code: ${project.reference}`} />
        <Link href={`/projects/${project.id}/inspections`}>
          <Button variant="secondary" type="button">
            Back
          </Button>
        </Link>
      </div>

      {error ? <p className="text-sm font-semibold text-semantic-danger">Error: {error}</p> : null}

      <SectionCard title="Inspection details" subtitle="Create a report, then add items and photos.">
        <form action={createInspectionReport.bind(null, project.id)} className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-6">
            <label className="text-xs font-semibold text-brand-secondary">Inspection date/time</label>
            <Input className="mt-1" defaultValue={format(new Date(), "yyyy-MM-dd'T'HH:mm")} name="inspectionDate" type="datetime-local" />
          </div>
          <div className="md:col-span-6 flex items-end">
            <Button type="submit">Create report</Button>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}

