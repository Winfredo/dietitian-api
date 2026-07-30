import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import { env } from "../config/env";

let s3: S3Client | undefined;

function getClient(): S3Client {
  if (!s3) {
    s3 = new S3Client({ region: env.AWS_REGION });
  }
  return s3;
}

export async function uploadFile(
  buffer: Buffer,
  originalFilename: string
): Promise<string> {
  const key = `medical-history/${randomUUID()}-${originalFilename}`;
  await getClient().send(
    new PutObjectCommand({ Bucket: env.S3_BUCKET, Key: key, Body: buffer })
  );
  return key;
}

export async function getPresignedUrl(
  key: string,
  expiresIn = 3600
): Promise<string> {
  const command = new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key });
  return getSignedUrl(getClient(), command, { expiresIn });
}