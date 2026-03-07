import { format } from "date-fns";

import { requireApiPermission } from "@/lib/api/auth";
import { db } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { csvResponse, toCsv } from "@/lib/export/csv";

type RouteContext = { params: { projectId: string } };

function decToNumber(v: unknown) {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return v;
  if (typeof v === "string") return Number(v);
  // Prisma.Decimal has toString()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return Number((v as any).toString());
}

const eur = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" });

export async function GET(_req: Request, ctx: RouteContext) {
  const auth = await requireApiPermission(PERMISSIONS.projectsRead);
  if (!auth.ok) return auth.response;

  const project = await db.project.findUnique({ where: { id: ctx.params.projectId }, select: { reference: true, name: true } });
  if (!project) return new Response("not_found", { status: 404 });

  const lines = await db.projectFinanceLine.findMany({
    where: { projectId: ctx.params.projectId },
    orderBy: [{ createdAt: "asc" }]
  });

  const totals = lines.reduce(
    (acc, l) => {
      acc.tendered += decToNumber(l.tenderedCost);
      acc.qty += decToNumber(l.qty);
      acc.actual += decToNumber(l.actualCost);
      acc.invoiced += decToNumber(l.invoicedCost);
      acc.margin += decToNumber(l.invoicedCost) - decToNumber(l.actualCost);
      return acc;
    },
    { tendered: 0, qty: 0, actual: 0, invoiced: 0, margin: 0 }
  );

  const rows: Array<Array<string | number | null>> = [
    ["Item", "Supplier", "Tendered Cost", "Qty", "Actual Cost", "Invoiced Cost", "Margin", "Created At"],
    ...lines.map((l) => {
      const margin = decToNumber(l.invoicedCost) - decToNumber(l.actualCost);
      return [
        l.item,
        l.supplier ?? "",
        l.tenderedCost ? eur.format(decToNumber(l.tenderedCost)) : "",
        l.qty ? Number(decToNumber(l.qty)).toFixed(2) : "",
        l.actualCost ? eur.format(decToNumber(l.actualCost)) : "",
        l.invoicedCost ? eur.format(decToNumber(l.invoicedCost)) : "",
        eur.format(margin),
        format(l.createdAt, "yyyy-MM-dd HH:mm")
      ];
    })
  ];

  if (lines.length) {
    rows.push([
      "Totals",
      "",
      eur.format(totals.tendered),
      totals.qty.toFixed(2),
      eur.format(totals.actual),
      eur.format(totals.invoiced),
      eur.format(totals.margin),
      ""
    ]);
  }

  const csv = toCsv(rows);
  return csvResponse({ filename: `${project.reference}_finance.csv`, csv });
}

