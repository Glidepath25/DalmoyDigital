import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { PDFDocument, rgb, type PDFFont, type PDFImage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { format } from "date-fns";
import { NextResponse } from "next/server";

import { requireApiPermission } from "@/lib/api/auth";
import { dalmoyBrand } from "@/lib/brand/tokens";
import { db } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";

export const runtime = "nodejs";

type RouteContext = { params: { projectId: string } };

type Column = { header: string; width: number };

type PdfColor = ReturnType<typeof rgb>;

type TextDrawOptions = {
  font: PDFFont;
  size: number;
  color: PdfColor;
  maxWidth: number;
  lineGap?: number;
};

const PACK_BRAND = dalmoyBrand.colors;

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const PAGE_MARGIN = 40;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;

function resolvePackAssetPaths() {
  const root = process.cwd();
  return {
    regular: join(root, "public", "fonts", "Lato-Regular.ttf"),
    bold: join(root, "public", "fonts", "Lato-Bold.ttf"),
    logo: join(root, "public", "brand", "dalmoy-logo-secondary.png")
  };
}

function hexToRgb(hex: string): PdfColor {
  const normalized = hex.replace("#", "");
  const fullHex = normalized.length === 3 ? normalized.split("").map((v) => `${v}${v}`).join("") : normalized;
  const value = Number.parseInt(fullHex, 16);
  const r = ((value >> 16) & 255) / 255;
  const g = ((value >> 8) & 255) / 255;
  const b = (value & 255) / 255;
  return rgb(r, g, b);
}

function toText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function toTextOrDash(value: unknown): string {
  const text = toText(value);
  return text.length > 0 ? text : "-";
}

function splitLongToken(token: string, font: PDFFont, size: number, maxWidth: number): string[] {
  if (token.length === 0) return [""];
  if (font.widthOfTextAtSize(token, size) <= maxWidth) return [token];

  const chunks: string[] = [];
  let remaining = token;

  while (remaining.length > 0) {
    let take = 1;
    for (let i = 1; i <= remaining.length; i += 1) {
      const candidate = remaining.slice(0, i);
      if (font.widthOfTextAtSize(candidate, size) > maxWidth) {
        take = Math.max(1, i - 1);
        break;
      }
      take = i;
    }
    chunks.push(remaining.slice(0, take));
    remaining = remaining.slice(take);
  }

  return chunks;
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const lines: string[] = [];
  const paragraphs = normalized.split("\n");

  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      continue;
    }

    let current = "";

    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        current = candidate;
        continue;
      }

      if (current) {
        lines.push(current);
        current = "";
      }

      const splitWord = splitLongToken(word, font, size, maxWidth);
      if (splitWord.length === 1) {
        current = splitWord[0];
      } else {
        lines.push(...splitWord.slice(0, -1));
        current = splitWord[splitWord.length - 1] ?? "";
      }
    }

    if (current) {
      lines.push(current);
    }
  }

  return lines;
}

function truncateText(text: string, font: PDFFont, size: number, maxWidth: number): string {
  const normalized = toText(text);
  if (!normalized) return "";
  if (font.widthOfTextAtSize(normalized, size) <= maxWidth) return normalized;

  const ellipsis = "...";
  let result = normalized;

  while (result.length > 0 && font.widthOfTextAtSize(`${result}${ellipsis}`, size) > maxWidth) {
    result = result.slice(0, -1);
  }

  return result.length > 0 ? `${result}${ellipsis}` : ellipsis;
}

function formatSafeDate(date: Date | null | undefined, pattern: string): string {
  if (!date) return "-";
  return format(date, pattern);
}

function drawImageFitTop(args: {
  image: PDFImage;
  x: number;
  yTop: number;
  fitWidth: number;
  fitHeight: number;
  pageHeight: number;
  draw: (options: { x: number; y: number; width: number; height: number }) => void;
}) {
  const scale = Math.min(args.fitWidth / args.image.width, args.fitHeight / args.image.height);
  const width = args.image.width * scale;
  const height = args.image.height * scale;

  args.draw({
    x: args.x,
    y: args.pageHeight - args.yTop - height,
    width,
    height
  });
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
    (acc, line) => {
      const tendered = line.tenderedCost ? Number(line.tenderedCost.toString()) : 0;
      const qty = line.qty ? Number(line.qty.toString()) : 0;
      const actual = line.actualCost ? Number(line.actualCost.toString()) : 0;
      const invoiced = line.invoicedCost ? Number(line.invoicedCost.toString()) : 0;
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
    if (!existsSync(assets.regular) || !existsSync(assets.bold) || !existsSync(assets.logo)) {
      throw new Error(`Missing PDF assets. Expected fonts/logo at ${assets.regular}, ${assets.bold}, ${assets.logo}`);
    }

    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);

    const [regularFont, boldFont, logoImage] = await Promise.all([
      pdfDoc.embedFont(readFileSync(assets.regular)),
      pdfDoc.embedFont(readFileSync(assets.bold)),
      pdfDoc.embedPng(readFileSync(assets.logo))
    ]);

    const colors = {
      shell: hexToRgb(PACK_BRAND.shell),
      foregroundOnShell: hexToRgb(PACK_BRAND.foregroundOnShell),
      accentSoft: hexToRgb(PACK_BRAND.accentSoft),
      border: hexToRgb(PACK_BRAND.border),
      ink: hexToRgb(PACK_BRAND.ink),
      inkMuted: hexToRgb(PACK_BRAND.inkMuted)
    };

    let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let cursorY = PAGE_MARGIN;

    const bottomLimit = PAGE_HEIGHT - PAGE_MARGIN;
    const lineHeight = (size: number, gap: number) => size + gap;

    const addPage = () => {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      cursorY = PAGE_MARGIN;
    };

    const wouldOverflow = (height: number) => cursorY + height > bottomLimit;

    const ensureSpace = (height: number) => {
      if (wouldOverflow(height)) addPage();
    };

    const drawRectTop = (x: number, yTop: number, width: number, height: number, color: PdfColor) => {
      page.drawRectangle({
        x,
        y: PAGE_HEIGHT - yTop - height,
        width,
        height,
        color
      });
    };

    const drawLineTop = (x1: number, x2: number, yTop: number, color: PdfColor, thickness: number) => {
      page.drawLine({
        start: { x: x1, y: PAGE_HEIGHT - yTop },
        end: { x: x2, y: PAGE_HEIGHT - yTop },
        color,
        thickness
      });
    };

    const drawTextLine = (text: string, x: number, yTop: number, font: PDFFont, size: number, color: PdfColor) => {
      page.drawText(text, {
        x,
        y: PAGE_HEIGHT - yTop - size,
        size,
        font,
        color
      });
    };

    const drawParagraph = (text: string, x: number, yTop: number, options: TextDrawOptions): number => {
      const gap = options.lineGap ?? 2;
      const lines = wrapText(text, options.font, options.size, options.maxWidth);
      if (lines.length === 0) return 0;

      lines.forEach((line, index) => {
        drawTextLine(line, x, yTop + index * lineHeight(options.size, gap), options.font, options.size, options.color);
      });

      return lines.length * lineHeight(options.size, gap);
    };

    const sectionTitle = (title: string) => {
      cursorY += 10;
      ensureSpace(26);
      const titleHeight = drawParagraph(title, PAGE_MARGIN, cursorY, {
        font: boldFont,
        size: 14,
        color: colors.ink,
        maxWidth: CONTENT_WIDTH
      });
      cursorY += titleHeight + 4;
      drawLineTop(PAGE_MARGIN, PAGE_WIDTH - PAGE_MARGIN, cursorY, colors.border, 1);
      cursorY += 10;
    };

    const keyValue = (items: Array<{ k: string; v: string }>) => {
      const keyWidth = 140;
      const valueWidth = CONTENT_WIDTH - keyWidth;
      const keySize = 10;
      const valueSize = 10;
      const gap = 2;

      items.forEach(({ k, v }) => {
        const keyText = toTextOrDash(k);
        const valueText = toTextOrDash(v);
        const keyLines = wrapText(keyText, boldFont, keySize, keyWidth - 4);
        const valueLines = wrapText(valueText, regularFont, valueSize, valueWidth - 4);
        const rowLines = Math.max(keyLines.length || 1, valueLines.length || 1);
        const rowHeight = rowLines * lineHeight(Math.max(keySize, valueSize), gap) + 4;

        ensureSpace(rowHeight + 2);

        keyLines.forEach((line, idx) => {
          drawTextLine(line, PAGE_MARGIN, cursorY + idx * lineHeight(keySize, gap), boldFont, keySize, colors.ink);
        });

        valueLines.forEach((line, idx) => {
          drawTextLine(
            line,
            PAGE_MARGIN + keyWidth,
            cursorY + idx * lineHeight(valueSize, gap),
            regularFont,
            valueSize,
            colors.inkMuted
          );
        });

        cursorY += rowHeight;
      });
    };

    const table = (columns: Column[], rows: string[][]) => {
      const headerHeight = 18;
      const rowHeight = 16;
      const tableWidth = columns.reduce((sum, col) => sum + col.width, 0);

      const drawHeader = () => {
        ensureSpace(headerHeight + rowHeight + 6);
        drawRectTop(PAGE_MARGIN, cursorY, tableWidth, headerHeight, colors.accentSoft);

        let x = PAGE_MARGIN;
        columns.forEach((col) => {
          drawTextLine(
            truncateText(col.header, boldFont, 9, col.width - 8),
            x + 4,
            cursorY + 5,
            boldFont,
            9,
            colors.ink
          );
          x += col.width;
        });

        cursorY += headerHeight;
      };

      drawHeader();

      rows.forEach((row) => {
        if (wouldOverflow(rowHeight + 6)) {
          addPage();
          drawHeader();
        }

        let x = PAGE_MARGIN;
        row.forEach((cell, index) => {
          const col = columns[index];
          if (!col) return;

          drawTextLine(
            truncateText(toText(cell), regularFont, 9, col.width - 8),
            x + 4,
            cursorY + 4,
            regularFont,
            9,
            colors.inkMuted
          );
          x += col.width;
        });

        drawLineTop(PAGE_MARGIN, PAGE_MARGIN + tableWidth, cursorY + rowHeight, colors.border, 0.5);
        cursorY += rowHeight;
      });

      cursorY += 6;
    };

    // Branded cover header
    drawRectTop(0, 0, PAGE_WIDTH, 92, colors.shell);
    drawImageFitTop({
      image: logoImage,
      x: PAGE_MARGIN,
      yTop: 22,
      fitWidth: 170,
      fitHeight: 42,
      pageHeight: PAGE_HEIGHT,
      draw: ({ x, y, width, height }) => page.drawImage(logoImage, { x, y, width, height })
    });

    drawTextLine("Project Pack (PDF Export)", PAGE_MARGIN, 70, regularFont, 10, colors.foregroundOnShell);
    cursorY = 110;

    const projectTitle = toTextOrDash(project.name);
    const projectSubtitle = `${toTextOrDash(project.reference)} | ${toTextOrDash(project.client?.name)}`;

    cursorY += drawParagraph(projectTitle, PAGE_MARGIN, cursorY, {
      font: boldFont,
      size: 16,
      color: colors.ink,
      maxWidth: CONTENT_WIDTH
    });
    cursorY += 2;

    cursorY += drawParagraph(projectSubtitle, PAGE_MARGIN, cursorY, {
      font: regularFont,
      size: 11,
      color: colors.inkMuted,
      maxWidth: CONTENT_WIDTH
    });
    cursorY += 2;

    cursorY += drawParagraph(`Generated: ${format(new Date(), "yyyy-MM-dd HH:mm")}`, PAGE_MARGIN, cursorY, {
      font: regularFont,
      size: 10,
      color: colors.inkMuted,
      maxWidth: CONTENT_WIDTH
    });

    sectionTitle("Project Overview");
    keyValue([
      { k: "Reference", v: toTextOrDash(project.reference) },
      { k: "Client", v: toTextOrDash(project.client?.name) },
      { k: "Status", v: toTextOrDash(project.status?.name) },
      { k: "RAG", v: toTextOrDash(project.ragOption?.label) },
      {
        k: "Senior Manager",
        v: toTextOrDash(project.seniorManagerUser ? project.seniorManagerUser.name ?? project.seniorManagerUser.email : "")
      },
      {
        k: "Site Manager",
        v: toTextOrDash(project.siteManagerUser ? project.siteManagerUser.name ?? project.siteManagerUser.email : "")
      },
      {
        k: "Contract Manager",
        v: toTextOrDash(project.contractManagerUser ? project.contractManagerUser.name ?? project.contractManagerUser.email : "")
      },
      { k: "Due date", v: formatSafeDate(project.dueDate, "yyyy-MM-dd") }
    ]);

    if (toText(project.notes)) {
      ensureSpace(60);
      cursorY += drawParagraph("Notes", PAGE_MARGIN, cursorY, {
        font: boldFont,
        size: 10,
        color: colors.ink,
        maxWidth: CONTENT_WIDTH
      });
      cursorY += 2;
      cursorY += drawParagraph(toText(project.notes), PAGE_MARGIN, cursorY, {
        font: regularFont,
        size: 10,
        color: colors.inkMuted,
        maxWidth: CONTENT_WIDTH
      });
    }

    sectionTitle("Programme of Works (Summary)");
    if (!milestones.length) {
      cursorY += drawParagraph("No programme milestones recorded.", PAGE_MARGIN, cursorY, {
        font: regularFont,
        size: 10,
        color: colors.inkMuted,
        maxWidth: CONTENT_WIDTH
      });
    } else {
      table(
        [
          { header: "Milestone", width: 220 },
          { header: "RAG", width: 90 },
          { header: "Forecast Start", width: 90 },
          { header: "Forecast Finish", width: 90 }
        ],
        milestones.slice(0, 18).map((milestone) => [
          toTextOrDash(milestone.milestoneName),
          toTextOrDash(milestone.ragOption?.label),
          milestone.forecastStart ? format(milestone.forecastStart, "yyyy-MM-dd") : "",
          milestone.forecastFinish ? format(milestone.forecastFinish, "yyyy-MM-dd") : ""
        ])
      );

      if (milestones.length > 18) {
        cursorY += drawParagraph(`(Showing first 18 of ${milestones.length} milestones)`, PAGE_MARGIN, cursorY, {
          font: regularFont,
          size: 9,
          color: colors.inkMuted,
          maxWidth: CONTENT_WIDTH
        });
      }
    }

    sectionTitle("Critical Action Items");
    if (!actionItems.length) {
      cursorY += drawParagraph("No critical action items recorded.", PAGE_MARGIN, cursorY, {
        font: regularFont,
        size: 10,
        color: colors.inkMuted,
        maxWidth: CONTENT_WIDTH
      });
    } else {
      table(
        [
          { header: "Action", width: 260 },
          { header: "Owner", width: 120 },
          { header: "Status", width: 80 },
          { header: "Due", width: 80 }
        ],
        actionItems.slice(0, 20).map((item) => [
          toTextOrDash(item.title),
          toTextOrDash(item.ownerUser ? item.ownerUser.name ?? item.ownerUser.email : ""),
          toTextOrDash(item.statusOption?.label),
          item.requiredClosureDate ? format(item.requiredClosureDate, "yyyy-MM-dd") : ""
        ])
      );

      if (actionItems.length > 20) {
        cursorY += drawParagraph(`(Showing first 20 of ${actionItems.length} action items)`, PAGE_MARGIN, cursorY, {
          font: regularFont,
          size: 9,
          color: colors.inkMuted,
          maxWidth: CONTENT_WIDTH
        });
      }
    }

    sectionTitle("Snag List");
    if (!snags.length) {
      cursorY += drawParagraph("No snags recorded.", PAGE_MARGIN, cursorY, {
        font: regularFont,
        size: 10,
        color: colors.inkMuted,
        maxWidth: CONTENT_WIDTH
      });
    } else {
      table(
        [
          { header: "Snag", width: 260 },
          { header: "Responsible", width: 120 },
          { header: "Status", width: 80 },
          { header: "Target", width: 80 }
        ],
        snags.slice(0, 20).map((snag) => [
          toTextOrDash(snag.title),
          toTextOrDash(snag.responsibleUser ? snag.responsibleUser.name ?? snag.responsibleUser.email : ""),
          toTextOrDash(snag.statusOption?.label),
          snag.targetClosureDate ? format(snag.targetClosureDate, "yyyy-MM-dd") : ""
        ])
      );

      if (snags.length > 20) {
        cursorY += drawParagraph(`(Showing first 20 of ${snags.length} snags)`, PAGE_MARGIN, cursorY, {
          font: regularFont,
          size: 9,
          color: colors.inkMuted,
          maxWidth: CONTENT_WIDTH
        });
      }
    }

    sectionTitle("Finance (Summary)");
    keyValue([
      { k: "Total tendered", v: eur.format(financeTotals.tendered) },
      { k: "Total actual", v: eur.format(financeTotals.actual) },
      { k: "Total invoiced", v: eur.format(financeTotals.invoiced) },
      { k: "Total margin", v: eur.format(financeTotals.margin) }
    ]);

    if (financeLines.length) {
      table(
        [
          { header: "Item", width: 220 },
          { header: "Supplier", width: 120 },
          { header: "Actual", width: 90 },
          { header: "Invoiced", width: 90 }
        ],
        financeLines.slice(0, 15).map((line) => [
          toTextOrDash(line.item),
          toTextOrDash(line.supplier),
          line.actualCost ? eur.format(Number(line.actualCost.toString())) : "",
          line.invoicedCost ? eur.format(Number(line.invoicedCost.toString())) : ""
        ])
      );

      if (financeLines.length > 15) {
        cursorY += drawParagraph(`(Showing first 15 of ${financeLines.length} finance lines)`, PAGE_MARGIN, cursorY, {
          font: regularFont,
          size: 9,
          color: colors.inkMuted,
          maxWidth: CONTENT_WIDTH
        });
      }
    } else {
      cursorY += drawParagraph("No finance lines recorded.", PAGE_MARGIN, cursorY, {
        font: regularFont,
        size: 10,
        color: colors.inkMuted,
        maxWidth: CONTENT_WIDTH
      });
    }

    sectionTitle("Attachments (Summary)");
    if (!attachments.length) {
      cursorY += drawParagraph("No attachments recorded.", PAGE_MARGIN, cursorY, {
        font: regularFont,
        size: 10,
        color: colors.inkMuted,
        maxWidth: CONTENT_WIDTH
      });
    } else {
      table(
        [
          { header: "File name", width: 240 },
          { header: "Category", width: 120 },
          { header: "Uploaded by", width: 120 },
          { header: "Uploaded", width: 80 }
        ],
        attachments.slice(0, 20).map((attachment) => [
          toTextOrDash(attachment.file?.originalName),
          toTextOrDash(attachment.categoryOption?.label),
          toTextOrDash(attachment.uploadedBy ? attachment.uploadedBy.name ?? attachment.uploadedBy.email : ""),
          format(attachment.createdAt, "yyyy-MM-dd")
        ])
      );

      if (attachments.length > 20) {
        cursorY += drawParagraph(`(Showing first 20 of ${attachments.length} attachments)`, PAGE_MARGIN, cursorY, {
          font: regularFont,
          size: 9,
          color: colors.inkMuted,
          maxWidth: CONTENT_WIDTH
        });
      }
    }

    sectionTitle("Site Inspections (Summary)");
    if (!inspections.length) {
      cursorY += drawParagraph("No site inspection reports recorded.", PAGE_MARGIN, cursorY, {
        font: regularFont,
        size: 10,
        color: colors.inkMuted,
        maxWidth: CONTENT_WIDTH
      });
    } else {
      table(
        [
          { header: "Date", width: 120 },
          { header: "Completed by", width: 180 },
          { header: "Items", width: 60 },
          { header: "Snags raised", width: 90 }
        ],
        inspections.map((report) => [
          format(report.inspectionDate, "yyyy-MM-dd HH:mm"),
          toTextOrDash(report.completedByUser ? report.completedByUser.name ?? report.completedByUser.email : ""),
          String(report.items?.length ?? 0),
          String((report.items ?? []).filter((item) => item.isSnag).length)
        ])
      );
    }

    sectionTitle("Audit Trail (Latest)");
    if (!audit.length) {
      cursorY += drawParagraph("No audit entries recorded.", PAGE_MARGIN, cursorY, {
        font: regularFont,
        size: 10,
        color: colors.inkMuted,
        maxWidth: CONTENT_WIDTH
      });
    } else {
      table(
        [
          { header: "When", width: 120 },
          { header: "User", width: 140 },
          { header: "Entity", width: 90 },
          { header: "Summary", width: 200 }
        ],
        audit.map((entry) => [
          format(entry.performedAt, "yyyy-MM-dd HH:mm"),
          toTextOrDash(entry.performedByUser ? entry.performedByUser.name ?? entry.performedByUser.email : ""),
          `${toTextOrDash(entry.entityType)}:${toTextOrDash(entry.actionType)}`,
          toTextOrDash(entry.summary)
        ])
      );
    }

    ensureSpace(24);
    cursorY += 6;
    cursorY += drawParagraph(
      "Generated by Dalmoy Digital. This pack is intended for internal/stakeholder sharing.",
      PAGE_MARGIN,
      cursorY,
      {
        font: regularFont,
        size: 8,
        color: colors.inkMuted,
        maxWidth: CONTENT_WIDTH
      }
    );

    const pdfBytes = await pdfDoc.save();

    return new Response(new Uint8Array(pdfBytes), {
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