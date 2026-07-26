import request from "supertest";
import app from "../src/index";

describe("GET /health", () => {
  it("returns 200 and status ok", async () => {
    const response = await request(app).get("/health");
    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
  });
});

