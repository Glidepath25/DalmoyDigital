declare namespace PDFKit {
  // Minimal typings used by our server-side PDF export route.
  // This avoids relying on a specific published `@types/pdfkit` version.
  type TextAlign = "left" | "center" | "right" | "justify";

  interface TextOptions {
    align?: TextAlign;
    width?: number;
    continued?: boolean;
    underline?: boolean;
    lineGap?: number;
    lineBreak?: boolean;
  }

  interface PDFDocument extends NodeJS.ReadWriteStream {
    page: {
      width: number;
      height: number;
      margins: { top: number; right: number; bottom: number; left: number };
    };

    y: number;

    addPage(): this;
    moveDown(lines?: number): this;
    font(name: string): this;
    fontSize(size: number): this;
    fillColor(color: string): this;
    strokeColor(color: string): this;
    lineWidth(width: number): this;
    moveTo(x: number, y: number): this;
    lineTo(x: number, y: number): this;
    stroke(): this;
    save(): this;
    restore(): this;
    rect(x: number, y: number, w: number, h: number): this;
    fill(color?: string): this;

    // Common PDFKit `text()` overloads used in our codebase.
    text(text: string, options?: TextOptions): this;
    text(text: string, x: number, options?: TextOptions): this;
    text(text: string, x: number, y: number, options?: TextOptions): this;
    // Fallback signature to avoid overly-strict typing blocking valid usage.
    text(text: string, x?: number | TextOptions, y?: number | TextOptions, options?: TextOptions): this;
    end(): this;
  }
}

declare module "pdfkit" {
  const PDFDocument: new (options?: unknown) => PDFKit.PDFDocument;
  export default PDFDocument;
}
