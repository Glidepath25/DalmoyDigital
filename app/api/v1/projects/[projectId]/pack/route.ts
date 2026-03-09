import { existsSync } from "node:fs";
import { join } from "node:path";

import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { format } from "date-fns";

import { requireApiPermission } from "@/lib/api/auth";
import { dalmoyBrand } from "@/lib/brand/tokens";
import { db } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";

export const runtime = "nodejs";

type RouteContext = { params: { projectId: string } };

type Column = { header: string; width: number };

const PACK_FONT_REGULAR = "PackSans";
const PACK_FONT_BOLD = "PackSans-Bold";
const PACK_BRAND = dalmoyBrand.colors;

function resolvePackAssetPaths() {
  const root = process.cwd();
  return {
    regular: join(root, "public", "fonts", "Lato-Regular.ttf"),
    bold: join(root, "public", "fonts", "Lato-Bold.ttf"),
    logo: join(root, "public", "brand", "dalmoy-logo-secondary.png")
  };
}

function registerPackFonts(doc: PDFKit.PDFDocument) {
  const fontPaths = resolvePackAssetPaths();
  if (!existsSync(fontPaths.regular) || !existsSync(fontPaths.bold)) {
    throw new Error(`Missing PDF font files at ${fontPaths.regular} and ${fontPaths.bold}`);
  }
  doc.registerFont(PACK_FONT_REGULAR, fontPaths.regular);
  doc.registerFont(PACK_FONT_BOLD, fontPaths.bold);
}

function toBuffer(build: (doc: PDFKit.PDFDocument) => void) {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    try {
      registerPackFonts(doc);
      build(doc);
    } catch (error) {
      reject(error);
      return;
    }
    doc.end();
  });
}

function primary(doc: PDFKit.PDFDocument) {
  return doc.fillColor(PACK_BRAND.ink);
}

function secondary(doc: PDFKit.PDFDocument) {
  return doc.fillColor(PACK_BRAND.inkMuted);
}

function sectionTitle(doc: PDFKit.PDFDocument, title: string) {
  doc.moveDown(0.6);
  primary(doc).fontSize(14).font(PACK_FONT_BOLD).text(title);
  doc.moveDown(0.2);
  doc
    .strokeColor(PACK_BRAND.border)
    .lineWidth(1)
    .moveTo(doc.page.margins.left, doc.y)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y)
    .stroke();
  doc.moveDown(0.4);
}

function keyValue(doc: PDFKit.PDFDocument, items: Array<{ k: string; v: string }>) {
  const x = doc.page.margins.left;
  const kW = 140;
  const vW = doc.page.width - doc.page.margins.left - doc.page.margins.right - kW;
  items.forEach(({ k, v }) => {
    primary(doc).fontSize(10).font(PACK_FONT_BOLD).text(k, x, doc.y, { width: kW });
    secondary(doc).fontSize(10).font(PACK_FONT_REGULAR).text(v || "-", x + kW, doc.y - 10, { width: vW });
    doc.moveDown(0.4);
  });
}

function ensureSpace(doc: PDFKit.PDFDocument, height: number) {
  const bottom = doc.page.height - doc.page.margins.bottom;
  if (doc.y + height > bottom) doc.addPage();
}

function table(doc: PDFKit.PDFDocument, columns: Column[], rows: string[][]) {
  const x0 = doc.page.margins.left;
  const y0 = doc.y;

  const rowH = 16;
  const headerH = 18;

  ensureSpace(doc, headerH + rows.length * rowH + 10);

  // Header background
  doc
    .save()
    .rect(x0, y0, columns.reduce((s, c) => s + c.width, 0), headerH)
    .fill(PACK_BRAND.accentSoft)
    .restore();

  let x = x0;
  columns.forEach((c) => {
    primary(doc).fontSize(9).font(PACK_FONT_BOLD).text(c.header, x + 4, y0 + 5, { width: c.width - 8 });
    x += c.width;
  });

  let y = y0 + headerH;
  rows.forEach((r) => {
    ensureSpace(doc, rowH + 6);
    let cx = x0;
    r.forEach((cell, i) => {
      const col = columns[i];
      secondary(doc)
        .fontSize(9)
        .font(PACK_FONT_REGULAR)
        .text(cell || "", cx + 4, y + 4, { width: col.width - 8, lineBreak: false });
      cx += col.width;
    });
    doc
      .strokeColor(PACK_BRAND.border)
      .lineWidth(0.5)
      .moveTo(x0, y + rowH)
      .lineTo(x0 + columns.reduce((s, c) => s + c.width, 0), y + rowH)
      .stroke();
    y += rowH;
  });
  doc.y = y + 6;
}

export async function GET(_req: Request, ctx: RouteContext) {
  const auth = await requireApiPermission(PERMISSIONS.projectsRead);
  if (!auth.ok) return auth.response;

  const project = await db.project.findUnique({
    where: { id: ctx.params.projectId },
    include: {
      client: true,
      status: true,
      ragOption: true,
      seniorManagerUser: true,
      siteManagerUser: true,
      contractManagerUser: true
    }
  });
  if (!project) return new Response("not_found", { status: 404 });

  const [milestones, actionItems, snags, financeLines, attachments, inspections, audit] = await Promise.all([
    db.projectMilestone.findMany({
      where: { projectId: project.id },
      include: { ragOption: true },
      orderBy: [{ sortOrder: "asc" }, { milestoneName: "asc" }]
    }),
    db.projectActionItem.findMany({
      where: { projectId: project.id },
      include: { ownerUser: true, statusOption: true, priorityOption: true },
      orderBy: [{ requiredClosureDate: "asc" }, { createdAt: "desc" }]
    }),
    db.projectSnag.findMany({
      where: { projectId: project.id },
      include: { statusOption: true, priorityOption: true, responsibleUser: true },
      orderBy: [{ dateRaised: "desc" }]
    }),
    db.projectFinanceLine.findMany({
      where: { projectId: project.id },
      orderBy: [{ createdAt: "asc" }]
    }),
    db.projectAttachment.findMany({
      where: { projectId: project.id },
      include: { file: true, categoryOption: true, uploadedBy: true },
      orderBy: [{ createdAt: "desc" }]
    }),
    db.siteInspectionReport.findMany({
      where: { projectId: project.id },
      include: { completedByUser: true, items: { select: { isSnag: true } } },
      orderBy: [{ inspectionDate: "desc" }],
      take: 50
    }),
    db.projectAuditTrailEntry.findMany({
      where: { projectId: project.id },
      include: { performedByUser: true },
      orderBy: [{ performedAt: "desc" }],
      take: 25
    })
  ]);

  const eur = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" });
  const financeTotals = financeLines.reduce(
    (acc, l) => {
      const tendered = l.tenderedCost ? Number(l.tenderedCost.toString()) : 0;
      const qty = l.qty ? Number(l.qty.toString()) : 0;
      const actual = l.actualCost ? Number(l.actualCost.toString()) : 0;
      const invoiced = l.invoicedCost ? Number(l.invoicedCost.toString()) : 0;
      acc.tendered += tendered;
      acc.qty += qty;
      acc.actual += actual;
      acc.invoiced += invoiced;
      acc.margin += invoiced - actual;
      return acc;
    },
    { tendered: 0, qty: 0, actual: 0, invoiced: 0, margin: 0 }
  );

  try {
    const assets = resolvePackAssetPaths();
    if (!existsSync(assets.logo)) {
      throw new Error(`Missing PDF logo file at ${assets.logo}`);
    }

    const buffer = await toBuffer((doc) => {
      // Branded cover header
      doc.save().rect(0, 0, doc.page.width, 92).fill(PACK_BRAND.shell).restore();
      doc.image(assets.logo, doc.page.margins.left, 22, { fit: [170, 42] });
      doc.fillColor(PACK_BRAND.foregroundOnShell).font(PACK_FONT_REGULAR).fontSize(10).text("Project Pack (PDF Export)", doc.page.margins.left, 70);
      doc.y = 110;

      primary(doc).font(PACK_FONT_BOLD).fontSize(16).text(project.name);
      secondary(doc)
        .font(PACK_FONT_REGULAR)
        .fontSize(11)
        .text(`${project.reference} | ${project.client.name}`, { continued: false });
      doc.moveDown(0.4);
      secondary(doc).fontSize(10).text(`Generated: ${format(new Date(), "yyyy-MM-dd HH:mm")}`);

      sectionTitle(doc, "Project Overview");
      keyValue(doc, [
        { k: "Reference", v: project.reference },
        { k: "Client", v: project.client.name },
        { k: "Status", v: project.status.name },
        { k: "RAG", v: project.ragOption ? project.ragOption.label : "-" },
        {
          k: "Senior Manager",
          v: project.seniorManagerUser ? project.seniorManagerUser.name ?? project.seniorManagerUser.email : "-"
        },
        {
          k: "Site Manager",
          v: project.siteManagerUser ? project.siteManagerUser.name ?? project.siteManagerUser.email : "-"
        },
        {
          k: "Contract Manager",
          v: project.contractManagerUser ? project.contractManagerUser.name ?? project.contractManagerUser.email : "-"
        },
        { k: "Due date", v: project.dueDate ? format(project.dueDate, "yyyy-MM-dd") : "-" }
      ]);
      if (project.notes) {
        ensureSpace(doc, 60);
        primary(doc).font(PACK_FONT_BOLD).fontSize(10).text("Notes");
        secondary(doc).font(PACK_FONT_REGULAR).fontSize(10).text(project.notes);
      }

      sectionTitle(doc, "Programme of Works (Summary)");
      if (!milestones.length) {
        secondary(doc).fontSize(10).text("No programme milestones recorded.");
      } else {
        table(
          doc,
          [
            { header: "Milestone", width: 220 },
            { header: "RAG", width: 90 },
            { header: "Forecast Start", width: 90 },
            { header: "Forecast Finish", width: 90 }
          ],
          milestones.slice(0, 18).map((m) => [
            m.milestoneName,
            m.ragOption?.label ?? "",
            m.forecastStart ? format(m.forecastStart, "yyyy-MM-dd") : "",
            m.forecastFinish ? format(m.forecastFinish, "yyyy-MM-dd") : ""
          ])
        );
        if (milestones.length > 18) secondary(doc).fontSize(9).text(`(Showing first 18 of ${milestones.length} milestones)`);
      }

      sectionTitle(doc, "Critical Action Items");
      if (!actionItems.length) {
        secondary(doc).fontSize(10).text("No critical action items recorded.");
      } else {
        table(
          doc,
          [
            { header: "Action", width: 260 },
            { header: "Owner", width: 120 },
            { header: "Status", width: 80 },
            { header: "Due", width: 80 }
          ],
          actionItems.slice(0, 20).map((a) => [
            a.title,
            a.ownerUser ? a.ownerUser.name ?? a.ownerUser.email : "",
            a.statusOption?.label ?? "",
            a.requiredClosureDate ? format(a.requiredClosureDate, "yyyy-MM-dd") : ""
          ])
        );
        if (actionItems.length > 20) secondary(doc).fontSize(9).text(`(Showing first 20 of ${actionItems.length} action items)`);
      }

      sectionTitle(doc, "Snag List");
      if (!snags.length) {
        secondary(doc).fontSize(10).text("No snags recorded.");
      } else {
        table(
          doc,
          [
            { header: "Snag", width: 260 },
            { header: "Responsible", width: 120 },
            { header: "Status", width: 80 },
            { header: "Target", width: 80 }
          ],
          snags.slice(0, 20).map((s) => [
            s.title,
            s.responsibleUser ? s.responsibleUser.name ?? s.responsibleUser.email : "",
            s.statusOption?.label ?? "",
            s.targetClosureDate ? format(s.targetClosureDate, "yyyy-MM-dd") : ""
          ])
        );
        if (snags.length > 20) secondary(doc).fontSize(9).text(`(Showing first 20 of ${snags.length} snags)`);
      }

      sectionTitle(doc, "Finance (Summary)");
      keyValue(doc, [
        { k: "Total tendered", v: eur.format(financeTotals.tendered) },
        { k: "Total actual", v: eur.format(financeTotals.actual) },
        { k: "Total invoiced", v: eur.format(financeTotals.invoiced) },
        { k: "Total margin", v: eur.format(financeTotals.margin) }
      ]);
      if (financeLines.length) {
        table(
          doc,
          [
            { header: "Item", width: 220 },
            { header: "Supplier", width: 120 },
            { header: "Actual", width: 90 },
            { header: "Invoiced", width: 90 }
          ],
          financeLines.slice(0, 15).map((l) => [
            l.item,
            l.supplier ?? "",
            l.actualCost ? eur.format(Number(l.actualCost.toString())) : "",
            l.invoicedCost ? eur.format(Number(l.invoicedCost.toString())) : ""
          ])
        );
        if (financeLines.length > 15) secondary(doc).fontSize(9).text(`(Showing first 15 of ${financeLines.length} finance lines)`);
      } else {
        secondary(doc).fontSize(10).text("No finance lines recorded.");
      }

      sectionTitle(doc, "Attachments (Summary)");
      if (!attachments.length) {
        secondary(doc).fontSize(10).text("No attachments recorded.");
      } else {
        table(
          doc,
          [
            { header: "File name", width: 240 },
            { header: "Category", width: 120 },
            { header: "Uploaded by", width: 120 },
            { header: "Uploaded", width: 80 }
          ],
          attachments.slice(0, 20).map((a) => [
            a.file.originalName,
            a.categoryOption?.label ?? "",
            a.uploadedBy ? a.uploadedBy.name ?? a.uploadedBy.email : "",
            format(a.createdAt, "yyyy-MM-dd")
          ])
        );
        if (attachments.length > 20) secondary(doc).fontSize(9).text(`(Showing first 20 of ${attachments.length} attachments)`);
      }

      sectionTitle(doc, "Site Inspections (Summary)");
      if (!inspections.length) {
        secondary(doc).fontSize(10).text("No site inspection reports recorded.");
      } else {
        table(
          doc,
          [
            { header: "Date", width: 120 },
            { header: "Completed by", width: 180 },
            { header: "Items", width: 60 },
            { header: "Snags raised", width: 90 }
          ],
          inspections.map((r) => [
            format(r.inspectionDate, "yyyy-MM-dd HH:mm"),
            r.completedByUser ? r.completedByUser.name ?? r.completedByUser.email : "",
            String(r.items.length),
            String(r.items.filter((i) => i.isSnag).length)
          ])
        );
      }

      sectionTitle(doc, "Audit Trail (Latest)");
      if (!audit.length) {
        secondary(doc).fontSize(10).text("No audit entries recorded.");
      } else {
        table(
          doc,
          [
            { header: "When", width: 120 },
            { header: "User", width: 140 },
            { header: "Entity", width: 90 },
            { header: "Summary", width: 200 }
          ],
          audit.map((e) => [
            format(e.performedAt, "yyyy-MM-dd HH:mm"),
            e.performedByUser ? e.performedByUser.name ?? e.performedByUser.email : "",
            `${e.entityType}:${e.actionType}`,
            e.summary ?? ""
          ])
        );
      }

      // Footer note
      doc.moveDown(0.5);
      secondary(doc).fontSize(8).text("Generated by Dalmoy Digital. This pack is intended for internal/stakeholder sharing.", {
        align: "left"
      });
    });

    const body = new Uint8Array(buffer);

    return new Response(body, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=\"${project.reference.replace(/\"/g, "")}_project_pack.pdf\"`,
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    console.error(`[project-pack-pdf] Failed to generate PDF for project ${ctx.params.projectId}: ${message}`);
    return NextResponse.json({ error: "pdf_generation_failed" }, { status: 500 });
  }
}
