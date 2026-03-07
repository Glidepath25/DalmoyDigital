function escapeCsvCell(value: string) {
  const needsQuotes = value.includes(",") || value.includes("\n") || value.includes("\r") || value.includes("\"");
  const escaped = value.replace(/\"/g, "\"\"");
  return needsQuotes ? `"${escaped}"` : escaped;
}

export function toCsv(rows: Array<Array<string | number | null | undefined>>) {
  return rows
    .map((row) =>
      row
        .map((cell) => escapeCsvCell(cell === null || cell === undefined ? "" : String(cell)))
        .join(",")
    )
    .join("\r\n");
}

export function csvResponse(input: { filename: string; csv: string }) {
  // Add a UTF-8 BOM for better Excel compatibility.
  const body = `\uFEFF${input.csv}`;
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=\"${input.filename.replace(/\"/g, "")}\"`,
      "Cache-Control": "no-store"
    }
  });
}

