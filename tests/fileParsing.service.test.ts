import { buildExtractionContent } from "../src/services/fileParsing.service";

describe("buildExtractionContent", () => {
  it("builds an image content block for image mimetypes", async () => {
    const buffer = Buffer.from("fake png bytes");

    const content = await buildExtractionContent(buffer, "image/png");

    expect(content).toEqual([
      {
        type: "image",
        mimeType: "image/png",
        data: buffer.toString("base64"),
      },
    ]);
  });

  it("builds a file content block for application/pdf", async () => {
    const buffer = Buffer.from("fake pdf bytes");

    const content = await buildExtractionContent(buffer, "application/pdf");

    expect(content).toEqual([
      {
        type: "file",
        mimeType: "application/pdf",
        data: buffer.toString("base64"),
      },
    ]);
  });

  it("builds a plain-text content block from CSV data", async () => {
    const csv = "Field,Value\nFull Name,Jane Doe\nAge,45";
    const buffer = Buffer.from(csv);

    const content = await buildExtractionContent(buffer, "text/csv");

    expect(content).toEqual([
      {
        type: "text",
        text: "CSV data:\nField | Value\nFull Name | Jane Doe\nAge | 45",
      },
    ]);
  });

  it("also treats application/vnd.ms-excel as CSV", async () => {
    const buffer = Buffer.from("Field,Value\nAge,45");

    const content = await buildExtractionContent(
      buffer,
      "application/vnd.ms-excel"
    );

    expect(content[0]?.type).toBe("text");
  });

  it("skips blank lines when parsing CSV", async () => {
    const csv = "Field,Value\n\nAge,45\n\n";
    const buffer = Buffer.from(csv);

    const content = await buildExtractionContent(buffer, "text/csv");

    expect(content).toEqual([
      {
        type: "text",
        text: "CSV data:\nField | Value\nAge | 45",
      },
    ]);
  });

  it("throws for an unsupported mimetype", async () => {
    const buffer = Buffer.from("whatever");

    await expect(
      buildExtractionContent(buffer, "application/zip")
    ).rejects.toThrow("Unsupported file type: application/zip");
  });
});