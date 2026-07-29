jest.mock("dotenv", () => ({ config: jest.fn() }));

describe("env config", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("falls back to defaults when env vars are unset", () => {
    delete process.env.MONGODB_URI;
    delete process.env.API_KEY;
    delete process.env.PORT;
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;
    delete process.env.AWS_REGION;
    delete process.env.S3_BUCKET;
    delete process.env.OPENAI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    const { env } = require("../src/config/env");

    expect(env).toEqual({
      MONGODB_URI: "",
      API_KEY: "",
      PORT: "3000",
      AWS_ACCESS_KEY_ID: "",
      AWS_SECRET_ACCESS_KEY: "",
      AWS_REGION: "",
      S3_BUCKET: "",
      OPENAI_API_KEY: "",
      GEMINI_API_KEY: "",
    });
  });

  it("uses provided env vars when set", () => {
    process.env.PORT = "4000";
    process.env.API_KEY = "real-key";

    const { env } = require("../src/config/env");

    expect(env.PORT).toBe("4000");
    expect(env.API_KEY).toBe("real-key");
  });
});
