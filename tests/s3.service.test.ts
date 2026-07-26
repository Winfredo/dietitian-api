const sendMock = jest.fn();

jest.mock("@aws-sdk/client-s3", () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: sendMock })),
  PutObjectCommand: jest.fn().mockImplementation((input) => ({ input })),
  GetObjectCommand: jest.fn().mockImplementation((input) => ({ input })),
}));

jest.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: jest.fn(),
}));

import { uploadFile, getPresignedUrl } from "../src/services/s3.service";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../src/config/env";

describe("s3.service", () => {
  beforeEach(() => {
    sendMock.mockReset();
    (getSignedUrl as jest.Mock).mockReset();
  });

  describe("uploadFile", () => {
    it("uploads the buffer under a medical-history/ key and returns that key", async () => {
      sendMock.mockResolvedValue({});
      const buffer = Buffer.from("fake file content");

      const key = await uploadFile(buffer, "report.pdf");

      expect(key).toMatch(/^medical-history\/.+-report\.pdf$/);
      expect(PutObjectCommand).toHaveBeenCalledWith({
        Bucket: env.S3_BUCKET,
        Key: key,
        Body: buffer,
      });
      expect(sendMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("getPresignedUrl", () => {
    it("requests a signed url for the given key with the default expiry", async () => {
      (getSignedUrl as jest.Mock).mockResolvedValue(
        "https://signed.example/url"
      );

      const url = await getPresignedUrl("medical-history/some-key.pdf");

      expect(url).toBe("https://signed.example/url");
      expect(GetObjectCommand).toHaveBeenCalledWith({
        Bucket: env.S3_BUCKET,
        Key: "medical-history/some-key.pdf",
      });
      expect(getSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        { expiresIn: 3600 }
      );
    });

    it("respects a custom expiresIn value", async () => {
      (getSignedUrl as jest.Mock).mockResolvedValue(
        "https://signed.example/url"
      );

      await getPresignedUrl("some-key.pdf", 120);

      expect(getSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        { expiresIn: 120 }
      );
    });
  });
});