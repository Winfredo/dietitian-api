import { Request, Response, NextFunction } from "express";
import Patient from "../models/Patient";
import { uploadFile } from "../services/s3.service";

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
  } catch (err) {
    next(err);
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