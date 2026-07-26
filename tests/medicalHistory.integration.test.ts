import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";

jest.mock("../src/services/s3.service", () => ({
  uploadFile: jest.fn().mockResolvedValue("medical-history/fake-key.pdf"),
}));

import app from "../src/index";
import Patient from "../src/models/Patient";
import { env } from "../src/config/env";
import { uploadFile } from "../src/services/s3.service";

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterEach(async () => {
  await Patient.deleteMany({});
  (uploadFile as jest.Mock).mockClear();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe("POST /medical-history/upload", () => {
  it("rejects requests with no api key", async () => {
    const response = await request(app)
      .post("/medical-history/upload")
      .attach("file", Buffer.from("fake pdf content"), "report.pdf");

    expect(response.status).toBe(401);
  });

  it("rejects requests with no file", async () => {
    const response = await request(app)
      .post("/medical-history/upload")
      .set("x-api-key", env.API_KEY);

    expect(response.status).toBe(400);
  });

  it("uploads the file, creates a Patient doc, and returns 202", async () => {
    const response = await request(app)
      .post("/medical-history/upload")
      .set("x-api-key", env.API_KEY)
      .field("fullName", "Jane Doe")
      .attach("file", Buffer.from("fake pdf content"), "report.pdf");

    expect(response.status).toBe(202);
    expect(response.body.status).toBe("processing");
    expect(uploadFile).toHaveBeenCalledTimes(1);

    const patient = await Patient.findById(response.body.patientId);
    expect(patient).not.toBeNull();
    expect(patient?.fullName).toBe("Jane Doe");
    expect(patient?.status).toBe("processing");
    expect(patient?.medicalHistoryS3Key).toBe("medical-history/fake-key.pdf");
  });
});

describe("GET /medical-history/:id", () => {
  it("rejects requests with no api key", async () => {
    const patient = await Patient.create({
      fullName: "Jane Doe",
      medicalHistoryS3Key: "medical-history/fake-key.pdf",
      originalFilename: "report.pdf",
    });

    const response = await request(app).get(
      `/medical-history/${patient._id}`
    );
    expect(response.status).toBe(401);
  });

  it("returns 404 for a patient that doesn't exist", async () => {
    const fakeId = new mongoose.Types.ObjectId();

    const response = await request(app)
      .get(`/medical-history/${fakeId}`)
      .set("x-api-key", env.API_KEY);

    expect(response.status).toBe(404);
  });

  it("returns the patient when found", async () => {
    const patient = await Patient.create({
      fullName: "Jane Doe",
      medicalHistoryS3Key: "medical-history/fake-key.pdf",
      originalFilename: "report.pdf",
    });

    const response = await request(app)
      .get(`/medical-history/${patient._id}`)
      .set("x-api-key", env.API_KEY);

    expect(response.status).toBe(200);
    expect(response.body.fullName).toBe("Jane Doe");
  });
});