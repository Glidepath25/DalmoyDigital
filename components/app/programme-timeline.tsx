"use client";

import { useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type TimelineMilestone = {
  id: string;
  name: string;
  start: string | null;
  finish: string | null;
  ragLabel?: string | null;
  ragValue?: string | null;
};

function ragColor(value: string | null | undefined) {
  const v = (value ?? "").toLowerCase();
  if (v.includes("green")) return "#2E7D32";
  if (v.includes("amber") || v.includes("yellow")) return "#F9A825";
  if (v.includes("red")) return "#C62828";
  return "#4C6A8A";
}

function fmtDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function ProgrammeTimeline(props: { milestones: TimelineMilestone[] }) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const parsed = useMemo(() => {
    const rows = props.milestones
      .map((m) => {
        const start = m.start ? new Date(m.start) : null;
        const finish = m.finish ? new Date(m.finish) : null;
        const validStart = start && !Number.isNaN(start.getTime()) ? start : null;
        const validFinish = finish && !Number.isNaN(finish.getTime()) ? finish : null;
        return { ...m, startDate: validStart, finishDate: validFinish };
      })
      .filter((m) => m.startDate && m.finishDate) as Array<TimelineMilestone & { startDate: Date; finishDate: Date }>;

    if (!rows.length) return null;

    const min = rows.reduce((acc, r) => (r.startDate < acc ? r.startDate : acc), rows[0].startDate);
    const max = rows.reduce((acc, r) => (r.finishDate > acc ? r.finishDate : acc), rows[0].finishDate);
    const spanDays = Math.max(1, Math.ceil((max.getTime() - min.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    return { rows, min, max, spanDays };
  }, [props.milestones]);

  const exportSvg = () => {
    setExportError(null);
    const svg = svgRef.current;
    if (!svg) return;
    try {
      const serializer = new XMLSerializer();
      const source = serializer.serializeToString(svg);
      const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
      downloadBlob(blob, "programme-timeline.svg");
    } catch {
      setExportError("Export failed.");
    }
  };

  if (!parsed) {
    return (
      <div className="dd-card p-4">
        <p className="text-sm font-semibold text-brand-primary">Timeline</p>
        <p className="mt-1 text-xs text-brand-secondary">Add milestone dates to see the timeline view.</p>
      </div>
    );
  }

  const { rows, min, max, spanDays } = parsed;

  if (spanDays > 366) {
    return (
      <div className="dd-card p-4">
        <p className="text-sm font-semibold text-brand-primary">Timeline</p>
        <p className="mt-1 text-xs text-brand-secondary">
          Timeline span is too large to render ({spanDays} days). Narrow dates to within a year to enable the timeline.
        </p>
      </div>
    );
  }

  const width = 1200;
  const leftLabelWidth = 280;
  const rightPad = 20;
  const chartWidth = width - leftLabelWidth - rightPad;
  const headerHeight = 44;
  const rowHeight = 30;
  const height = headerHeight + rows.length * rowHeight + 16;

  const xForDate = (d: Date) => {
    const days = (d.getTime() - min.getTime()) / (1000 * 60 * 60 * 24);
    return leftLabelWidth + (days / (spanDays - 1)) * chartWidth;
  };

  const weekLines: number[] = [];
  for (let i = 0; i < spanDays; i++) {
    const day = new Date(min.getTime() + i * 24 * 60 * 60 * 1000);
    if (day.getDay() === 1) weekLines.push(xForDate(day));
  }

  return (
    <div className="dd-card p-4 overflow-hidden">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-brand-primary">Programme timeline</p>
          <p className="mt-1 text-xs text-brand-secondary">
            {fmtDate(min)} to {fmtDate(max)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone="neutral">{rows.length} dated milestones</Badge>
          <Button type="button" variant="secondary" onClick={exportSvg}>
            Export SVG
          </Button>
        </div>
      </div>
      {exportError ? <p className="mt-2 text-xs font-semibold text-semantic-danger">{exportError}</p> : null}

      <div className="mt-4 overflow-x-auto">
        <svg
          ref={svgRef}
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="min-w-[900px] max-w-none"
          role="img"
          aria-label="Programme timeline"
        >
          <rect x={0} y={0} width={width} height={height} fill="#FFFFFF" rx={12} />
          <rect x={0} y={0} width={width} height={headerHeight} fill="#F5F6F7" rx={12} />

          <text x={16} y={28} fontSize={12} fontWeight={700} fill="#2F3B4C">
            Milestone
          </text>
          <text x={leftLabelWidth} y={28} fontSize={12} fontWeight={700} fill="#2F3B4C">
            Timeline
          </text>

          {weekLines.map((x) => (
            <line key={x} x1={x} y1={headerHeight} x2={x} y2={height - 10} stroke="#D7D9DD" strokeWidth={1} />
          ))}

          <line
            x1={leftLabelWidth}
            y1={headerHeight}
            x2={leftLabelWidth}
            y2={height - 10}
            stroke="#D7D9DD"
            strokeWidth={1}
          />

          <text x={leftLabelWidth} y={40} fontSize={10} fill="#2F3B4C">
            {fmtDate(min)}
          </text>
          <text x={width - rightPad} y={40} fontSize={10} fill="#2F3B4C" textAnchor="end">
            {fmtDate(max)}
          </text>

          {rows.map((m, idx) => {
            const y = headerHeight + idx * rowHeight + 8;
            const barY = y + 6;
            const x1 = xForDate(m.startDate);
            const x2 = xForDate(m.finishDate);
            const barW = Math.max(6, x2 - x1);
            const color = ragColor(m.ragValue ?? m.ragLabel);
            return (
              <g key={m.id}>
                <line x1={0} y1={y + rowHeight - 6} x2={width} y2={y + rowHeight - 6} stroke="#F5F6F7" />
                <text x={16} y={y + 14} fontSize={11} fontWeight={600} fill="#0F1C2E">
                  {m.name}
                </text>
                <rect x={x1} y={barY} width={barW} height={14} rx={7} fill={color} opacity={0.95} />
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

