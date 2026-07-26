import express from "express";
import request from "supertest";
import { errorHandler } from "../src/middleware/errorHandler";

const app = express();

app.get("/sync-throw", () => {
  throw new Error("boom");
});

app.get("/async-reject", async () => {
  throw new Error("boom async");
});

app.use(errorHandler);

describe("errorHandler", () => {
  it("catches a synchronous throw and returns 500", async () => {
    const response = await request(app).get("/sync-throw");
    expect(response.status).toBe(500);
    expect(response.body.error).toBe("Internal server error");
  });

  it("catches a rejected promise from an async handler and returns 500", async () => {
    const response = await request(app).get("/async-reject");
    expect(response.status).toBe(500);
    expect(response.body.error).toBe("Internal server error");
  });
});