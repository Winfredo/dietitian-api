import { Request, Response, NextFunction } from "express";
import Patient from "../models/Patient";
import NutritionPlan from "../models/NutritionPlan";
import { uploadFile } from "../services/s3.service";
import { buildExtractionContent } from "../services/fileParsing.service";
import {
  extractMedicalHistory,
  generateNutritionPlan,
} from "../services/llm.service";

export async function uploadMedicalHistory(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.file) return res.status(400).json({ error: "file is required" });

    const s3Key = await uploadFile(req.file.buffer, req.file.originalname);

    const patient = await Patient.create({
      fullName: req.body.fullName ?? "Unknown",
      medicalHistoryS3Key: s3Key,
      originalFilename: req.file.originalname,
    });

    res.status(202).json({ patientId: patient._id, status: "processing" });

    void processHistoryAsync(
      patient._id.toString(),
      req.file.buffer,
      req.file.mimetype
    );
  } catch (err) {
    next(err);
  }
}

async function processHistoryAsync(
  patientId: string,
  buffer: Buffer,
  mimeType: string
) {
  try {
    const content = await buildExtractionContent(buffer, mimeType);
    const history = await extractMedicalHistory(content);
    const plan = await generateNutritionPlan(history);

    await NutritionPlan.create({
      patientId,
      extractedHistory: history,
      ...plan,
    });
    await Patient.findByIdAndUpdate(patientId, { status: "analyzed" });
  } catch (err) {
    console.error("processHistoryAsync failed:", err);
    await Patient.findByIdAndUpdate(patientId, { status: "failed" });
  }
}

export async function getPatient(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ error: "Not found" });
    res.json(patient);
  } catch (err) {
    next(err);
  }
}
