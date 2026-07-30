import Papa from "papaparse";

export type ExtractionContentBlock =
  | { type: "text"; text: string }
  | { type: "image"; mimeType: string; data: string }
  | { type: "file"; mimeType: string; data: string };

const CSV_MIME_TYPES = ["text/csv", "application/vnd.ms-excel"];

export async function buildExtractionContent(
  buffer: Buffer,
  mimeType: string
): Promise<ExtractionContentBlock[]> {
  if (mimeType.startsWith("image/")) {
    return [{ type: "image", mimeType, data: buffer.toString("base64") }];
  }

  if (mimeType === "application/pdf") {
    return [{ type: "file", mimeType, data: buffer.toString("base64") }];
  }

  if (CSV_MIME_TYPES.includes(mimeType)) {
    const { data } = Papa.parse<string[]>(buffer.toString("utf-8").trim(), {
      skipEmptyLines: true,
    });
    const table = data.map((row) => row.join(" | ")).join("\n");
    return [{ type: "text", text: `CSV data:\n${table}` }];
  }

  throw new Error(`Unsupported file type: ${mimeType}`);
}
