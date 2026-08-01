import dotenv from "dotenv";
dotenv.config();

export const env = {
  MONGODB_URI: process.env.MONGODB_URI ?? "",
  API_KEY: process.env.API_KEY ?? "",
  PORT: process.env.PORT ?? "3000",
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID ?? "",
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY ?? "",
  AWS_REGION: process.env.AWS_REGION ?? "",
  S3_BUCKET: process.env.S3_BUCKET ?? "",
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? "",
  GEMINI_API_KEY: process.env.GEMINI_API_KEY ?? "",
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? ""
};
