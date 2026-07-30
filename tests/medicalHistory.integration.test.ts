import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";

jest.mock("../src/services/s3.service", () => ({
  uploadFile: jest.fn().mockResolvedValue("medical-history/fake-key.pdf"),
}));

jest.mock("../src/services/llm.service", () => ({
  extractMedicalHistory: jest.fn().mockResolvedValue({
    fullName: "Jane Doe",
    conditions: [],
    medications: [],
    allergies: [],
    labResults: [],
    familyHistory: [],
  }),
  generateNutritionPlan: jest.fn().mockResolvedValue({
    summary: "Eat well.",
    foodsToAvoid: [],
    nutrientsToLimit: [],
    foodsToEat: [],
    nutrientsToIncrease: [],
    healthTips: [],
    disclaimer: "Not medical advice.",
  }),
}));

import app from "../src/index";
import Patient from "../src/models/Patient";
import NutritionPlan from "../src/models/NutritionPlan";
import { env } from "../src/config/env";
import { uploadFile } from "../src/services/s3.service";
import {
  extractMedicalHistory,
  generateNutritionPlan,
} from "../src/services/llm.service";

let mongod: MongoMemoryServer;

async function waitForStatus(
  patientId: string,
  status: string,
  timeoutMs = 2000
) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const patient = await Patient.findById(patientId);
    if (patient?.status === status) return patient;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error(
    `Timed out waiting for patient ${patientId} to reach status "${status}"`
  );
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterEach(async () => {
  await Patient.deleteMany({});
  await NutritionPlan.deleteMany({});
  (uploadFile as jest.Mock).mockClear();
  (extractMedicalHistory as jest.Mock).mockClear();
  (generateNutritionPlan as jest.Mock).mockClear();
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
    expect(patient?.medicalHistoryS3Key).toBe("medical-history/fake-key.pdf");

    // Wait for the background pipeline to settle so it can't leak into the next test.
    await waitForStatus(response.body.patientId, "analyzed");
  });

  it("processes the upload in the background: extracts history, generates a plan, and marks the patient analyzed", async () => {
    const response = await request(app)
      .post("/medical-history/upload")
      .set("x-api-key", env.API_KEY)
      .field("fullName", "Jane Doe")
      .attach("file", Buffer.from("fake pdf content"), "report.pdf");

    const patient = await waitForStatus(response.body.patientId, "analyzed");
    expect(patient.status).toBe("analyzed");

    expect(extractMedicalHistory).toHaveBeenCalledTimes(1);
    expect(generateNutritionPlan).toHaveBeenCalledTimes(1);

    const plan = await NutritionPlan.findOne({
      patientId: response.body.patientId,
    });
    expect(plan).not.toBeNull();
    expect(plan?.summary).toBe("Eat well.");
    expect(plan?.disclaimer).toBe("Not medical advice.");
  });

  it("marks the patient failed if the LLM pipeline throws", async () => {
    (extractMedicalHistory as jest.Mock).mockRejectedValueOnce(
      new Error("LLM is down")
    );

    const response = await request(app)
      .post("/medical-history/upload")
      .set("x-api-key", env.API_KEY)
      .field("fullName", "Jane Doe")
      .attach("file", Buffer.from("fake pdf content"), "report.pdf");

    const patient = await waitForStatus(response.body.patientId, "failed");
    expect(patient.status).toBe("failed");
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

describe("GET /nutrition/:patientId/plan", () => {
  it("rejects requests with no api key", async () => {
    const response = await request(app).get(
      `/nutrition/${new mongoose.Types.ObjectId()}/plan`
    );
    expect(response.status).toBe(401);
  });

  it("returns 404 when no plan exists for the patient", async () => {
    const response = await request(app)
      .get(`/nutrition/${new mongoose.Types.ObjectId()}/plan`)
      .set("x-api-key", env.API_KEY);

    expect(response.status).toBe(404);
  });

  it("returns the plan when one exists", async () => {
    const patientId = new mongoose.Types.ObjectId();
    await NutritionPlan.create({
      patientId,
      extractedHistory: { fullName: "Jane Doe" },
      summary: "Eat well.",
      foodsToAvoid: [],
      nutrientsToLimit: [],
      foodsToEat: [],
      nutrientsToIncrease: [],
      healthTips: [],
      disclaimer: "Not medical advice.",
    });

    const response = await request(app)
      .get(`/nutrition/${patientId}/plan`)
      .set("x-api-key", env.API_KEY);

    expect(response.status).toBe(200);
    expect(response.body.summary).toBe("Eat well.");
  });
});

describe("POST /nutrition/plan", () => {
  it("rejects requests with no api key", async () => {
    const response = await request(app)
      .post("/nutrition/plan")
      .send({ patientId: new mongoose.Types.ObjectId().toString() });

    expect(response.status).toBe(401);
  });

  it("rejects requests with no patientId", async () => {
    const response = await request(app)
      .post("/nutrition/plan")
      .set("x-api-key", env.API_KEY)
      .send({});

    expect(response.status).toBe(400);
  });

  it("returns 404 when the patient doesn't exist", async () => {
    const response = await request(app)
      .post("/nutrition/plan")
      .set("x-api-key", env.API_KEY)
      .send({ patientId: new mongoose.Types.ObjectId().toString() });

    expect(response.status).toBe(404);
  });

  it("returns 404 when the patient has no extracted history yet", async () => {
    const patient = await Patient.create({
      fullName: "Jane Doe",
      medicalHistoryS3Key: "medical-history/fake-key.pdf",
      originalFilename: "report.pdf",
    });

    const response = await request(app)
      .post("/nutrition/plan")
      .set("x-api-key", env.API_KEY)
      .send({ patientId: patient._id.toString() });

    expect(response.status).toBe(404);
  });

  it("regenerates a plan from the existing extracted history and returns 201", async () => {
    const patient = await Patient.create({
      fullName: "Jane Doe",
      medicalHistoryS3Key: "medical-history/fake-key.pdf",
      originalFilename: "report.pdf",
      status: "analyzed",
    });

    const extractedHistory = {
      fullName: "Jane Doe",
      conditions: [],
      medications: [],
      allergies: [],
      labResults: [],
      familyHistory: [],
    };

    await NutritionPlan.create({
      patientId: patient._id,
      extractedHistory,
      summary: "Old plan.",
      foodsToAvoid: [],
      nutrientsToLimit: [],
      foodsToEat: [],
      nutrientsToIncrease: [],
      healthTips: [],
      disclaimer: "Not medical advice.",
    });

    const response = await request(app)
      .post("/nutrition/plan")
      .set("x-api-key", env.API_KEY)
      .send({ patientId: patient._id.toString() });

    expect(response.status).toBe(201);
    expect(response.body.summary).toBe("Eat well.");
    expect(generateNutritionPlan).toHaveBeenCalledWith(extractedHistory);

    const plans = await NutritionPlan.find({ patientId: patient._id });
    expect(plans).toHaveLength(2);
  });
});