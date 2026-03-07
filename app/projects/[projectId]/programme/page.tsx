import { format } from "date-fns";
import { notFound } from "next/navigation";

import { DataTableShell } from "@/components/app/data-table-shell";
import { DownloadLink } from "@/components/app/download-link";
import { EmptyState } from "@/components/app/empty-state";
import { ProgrammeTimeline } from "@/components/app/programme-timeline";
import { SectionCard } from "@/components/app/section-card";
import { StatCard } from "@/components/app/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { requirePermission } from "@/lib/auth/guards";
import { requireUserId } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { hasPermission } from "@/lib/rbac";

import { initialiseProgramme, updateMilestone } from "./actions";

type PageProps = { params: { projectId: string }; searchParams?: Record<string, string | string[] | undefined> };

function toString(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

function toDateInputValue(d: Date | null | undefined) {
  if (!d) return "";
  return format(d, "yyyy-MM-dd");
}

function ragTone(value: string | null | undefined) {
  const v = (value ?? "").toLowerCase();
  if (v.includes("green")) return "success" as const;
  if (v.includes("amber") || v.includes("yellow")) return "warning" as const;
  if (v.includes("red")) return "danger" as const;
  return "neutral" as const;
}

function ragLevel(value: string | null | undefined) {
  const v = (value ?? "").toLowerCase();
  if (v.includes("red")) return 2;
  if (v.includes("amber") || v.includes("yellow")) return 1;
  if (v.includes("green")) return 0;
  return 0;
}

export default async function ProgrammePage(props: PageProps) {
  await requirePermission(PERMISSIONS.projectsRead);
  const userId = await requireUserId();
  const canEdit = await hasPermission(userId, PERMISSIONS.projectsUpdate);

  const project = await db.project.findUnique({ where: { id: props.params.projectId } });
  if (!project) notFound();

  const saved = toString(props.searchParams?.saved) === "1";
  const error = toString(props.searchParams?.error);

  const [milestones, ragType] = await Promise.all([
    db.projectMilestone.findMany({
      where: { projectId: project.id },
      include: { ragOption: true },
      orderBy: [{ sortOrder: "asc" }, { milestoneName: "asc" }]
    }),
    db.lookupType.findUnique({
      where: { key: "project_rag" },
      include: {
        options: {
          where: { isActive: true, archivedAt: null },
          orderBy: [{ sortOrder: "asc" }, { label: "asc" }]
        }
      }
    })
  ]);

  const ragOptions = ragType?.options ?? [];

  const now = new Date();
  const atRiskCount = milestones.filter((m) => ragLevel(m.ragOption?.value ?? m.ragOption?.label) === 1).length;
  const delayedCount = milestones.filter((m) => {
    const level = ragLevel(m.ragOption?.value ?? m.ragOption?.label);
    if (level === 2) return true;
    if (m.programFinish && m.forecastFinish && m.forecastFinish > m.programFinish) return true;
    return false;
  }).length;
  const finishedCount = milestones.filter((m) => {
    const finish = m.forecastFinish ?? m.programFinish;
    return finish ? finish < now : false;
  }).length;
  const overallLevel = milestones.reduce((acc, m) => Math.max(acc, ragLevel(m.ragOption?.value ?? m.ragOption?.label)), 0);
  const overallLabel = overallLevel === 2 ? "Delayed" : overallLevel === 1 ? "At Risk" : "On Track";

  const timelineMilestones = milestones.map((m) => ({
    id: m.id,
    name: m.milestoneName,
    start: (m.forecastStart ?? m.programStart)?.toISOString() ?? null,
    finish: (m.forecastFinish ?? m.programFinish)?.toISOString() ?? null,
    ragLabel: m.ragOption?.label ?? null,
    ragValue: m.ragOption?.value ?? null
  }));

  return (
    <div className="space-y-4">
      <DataTableShell
        title="Programme of Works"
        subtitle="Editable milestone plan with health dashboard and timeline export."
        actions={
          milestones.length === 0 && canEdit ? (
            <form action={initialiseProgramme.bind(null, project.id)}>
              <Button type="submit">Create default milestones</Button>
            </form>
          ) : (
            <div className="flex items-center gap-2">
              <Badge tone="neutral">{milestones.length} milestones</Badge>
              <Badge tone={overallLevel === 2 ? "danger" : overallLevel === 1 ? "warning" : "success"}>{overallLabel}</Badge>
              <DownloadLink href={`/api/v1/projects/${project.id}/programme/export`} label="Export CSV" />
            </div>
          )
        }
      >
        {saved ? <p className="mb-2 text-sm font-semibold text-semantic-success">Saved.</p> : null}
        {error ? <p className="mb-2 text-sm font-semibold text-semantic-danger">Error: {error}</p> : null}

        {milestones.length === 0 ? (
          <EmptyState
            title="No milestones yet"
            description={canEdit ? "Create the default programme milestones to start tracking." : "No programme milestones are set for this project."}
          />
        ) : (
          <div className="space-y-4">
            <SectionCard title="Programme dashboard" subtitle="RAG and slippage indicators across milestones.">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <StatCard label="Total milestones" value={milestones.length} />
                <StatCard label="Finished" value={finishedCount} hint="Forecast/program finish in the past" />
                <StatCard label="At risk" value={atRiskCount} hint="Amber milestones" />
                <StatCard label="Delayed" value={delayedCount} hint="Red or slipped finish date" />
                <StatCard label="Overall" value={overallLabel} hint="Worst milestone RAG" />
              </div>
            </SectionCard>

            <ProgrammeTimeline milestones={timelineMilestones} />

            <div className="dd-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-app-bg">
                <tr className="text-left text-xs font-semibold text-brand-secondary">
                  <th className="px-3 py-2">Milestone</th>
                  <th className="px-3 py-2">RAG</th>
                  <th className="px-3 py-2">Program Start</th>
                  <th className="px-3 py-2">Duration (days)</th>
                  <th className="px-3 py-2">Forecast Start</th>
                  <th className="px-3 py-2">Program Finish</th>
                  <th className="px-3 py-2">Forecast Finish</th>
                  <th className="px-3 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {milestones.map((m) => (
                  <tr key={m.id} className="border-t border-app-border hover:bg-app-bg/50">
                    <td className="px-3 py-2">
                      <p className="font-semibold text-brand-primary">{m.milestoneName}</p>
                      <p className="text-xs text-brand-secondary">{m.milestoneKey}</p>
                    </td>
                    <td className="px-3 py-2">
                      {m.ragOption ? <Badge tone={ragTone(m.ragOption.value)}>{m.ragOption.label}</Badge> : <Badge tone="neutral">—</Badge>}
                    </td>
                    <td className="px-3 py-2">{m.programStart ? format(m.programStart, "yyyy-MM-dd") : "—"}</td>
                    <td className="px-3 py-2">{m.durationDays ?? "—"}</td>
                    <td className="px-3 py-2">{m.forecastStart ? format(m.forecastStart, "yyyy-MM-dd") : "—"}</td>
                    <td className="px-3 py-2">{m.programFinish ? format(m.programFinish, "yyyy-MM-dd") : "—"}</td>
                    <td className="px-3 py-2">{m.forecastFinish ? format(m.forecastFinish, "yyyy-MM-dd") : "—"}</td>
                    <td className="px-3 py-2 text-right">
                      {canEdit ? (
                        <details className="inline-block text-left">
                          <summary className="cursor-pointer text-sm font-semibold text-brand-accent hover:underline">
                            Edit
                          </summary>
                            <div className="mt-2 dd-card p-3 w-[640px]">
                            <form action={updateMilestone.bind(null, project.id, m.id)} className="grid grid-cols-2 gap-2">
                              <div className="col-span-2">
                                <label className="text-xs font-semibold text-brand-secondary">RAG</label>
                                <Select className="mt-1" defaultValue={m.ragOptionId ?? ""} name="ragOptionId">
                                  <option value="">—</option>
                                  {ragOptions.map((o) => (
                                    <option key={o.id} value={o.id}>
                                      {o.label}
                                    </option>
                                  ))}
                                </Select>
                              </div>
                              <div>
                                <label className="text-xs font-semibold text-brand-secondary">Program Start</label>
                                <Input className="mt-1" defaultValue={toDateInputValue(m.programStart)} name="programStart" type="date" />
                              </div>
                              <div>
                                <label className="text-xs font-semibold text-brand-secondary">Duration (days)</label>
                                <Input className="mt-1" defaultValue={m.durationDays ?? ""} name="durationDays" type="number" min="0" step="1" />
                              </div>
                              <div>
                                <label className="text-xs font-semibold text-brand-secondary">Forecast Start</label>
                                <Input className="mt-1" defaultValue={toDateInputValue(m.forecastStart)} name="forecastStart" type="date" />
                              </div>
                              <div>
                                <label className="text-xs font-semibold text-brand-secondary">Forecast Finish</label>
                                <Input className="mt-1" defaultValue={toDateInputValue(m.forecastFinish)} name="forecastFinish" type="date" />
                              </div>
                              <div className="col-span-2">
                                <label className="text-xs font-semibold text-brand-secondary">Program Finish (auto)</label>
                                <Input className="mt-1" value={toDateInputValue(m.programFinish)} type="date" disabled />
                                <p className="mt-1 text-xs text-brand-secondary">
                                  Program Finish is calculated from Program Start + Duration. Forecast dates default to program dates until edited.
                                </p>
                              </div>
                              <div className="col-span-2 flex justify-end">
                                <Button type="submit">Save</Button>
                              </div>
                            </form>
                          </div>
                        </details>
                      ) : (
                        <span className="text-xs text-brand-secondary">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </div>
        )}
      </DataTableShell>
    </div>
  );
}
