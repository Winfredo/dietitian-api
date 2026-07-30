import express from "express";
import request from "supertest";
import { apiKeyAuth } from "../src/middleware/apiKeyAuth";
import { env } from "../src/config/env";

const app = express();
app.get("/protected", apiKeyAuth, (_req, res) => {
  res.status(200).json({ ok: true });
});

describe("apiKeyAuth", () => {
  it("rejects requests with no key", async () => {
    const response = await request(app).get("/protected");
    expect(response.status).toBe(401);
  });

  it("rejects requests with the wrong key", async () => {
    const response = await request(app)
      .get("/protected")
      .set("x-api-key", "wrong-key");
    expect(response.status).toBe(401);
  });

  it("allows requests with the correct key", async () => {
    const response = await request(app)
      .get("/protected")
      .set("x-api-key", env.API_KEY);
    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
  });

  it("rejects every request, even with no key sent, if API_KEY is unconfigured", async () => {
    const originalKey = env.API_KEY;
    env.API_KEY = "";
    try {
      const response = await request(app).get("/protected");
      expect(response.status).toBe(401);
    } finally {
      env.API_KEY = originalKey;
    }
  });
});