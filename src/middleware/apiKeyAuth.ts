import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { env } from "../config/env";

export function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
  const provided = req.header("x-api-key") ?? "";
  const expected = env.API_KEY;

  if (!expected) {
    return res.status(401).json({ error: "Invalid API key" });
  }

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);

  // Compare lengths first: timingSafeEqual throws if the buffers differ in size.
  const valid = a.length === b.length && crypto.timingSafeEqual(a, b);

  if (!valid) {
    return res.status(401).json({ error: "Invalid API key" });
  }

  next();
}