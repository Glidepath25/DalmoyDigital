declare namespace PDFKit {
  // Minimal typings used by our server-side PDF export route.
  // This avoids relying on a specific published `@types/pdfkit` version.
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
    text(text: string, x?: number, y?: number, options?: unknown): this;
    end(): this;
  }
}

declare module "pdfkit" {
  const PDFDocument: new (options?: unknown) => PDFKit.PDFDocument;
  export default PDFDocument;
}

