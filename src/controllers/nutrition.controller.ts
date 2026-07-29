import { Request, Response, NextFunction } from "express";
import Patient from "../models/Patient";
import NutritionPlan from "../models/NutritionPlan";
import { generateNutritionPlan } from "../services/llm.service";
import { MedicalHistorySchema } from "../schemas/medicalHistorySchema";

export async function getNutritionPlan(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const plan = await NutritionPlan.findOne({
      patientId: req.params.patientId,
    }).sort({ createdAt: -1 });

    if (!plan) return res.status(404).json({ error: "Not found" });
    res.json(plan);
  } catch (err) {
    next(err);
  }
}

export async function regenerateNutritionPlan(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { patientId } = req.body;
    if (!patientId) {
      return res.status(400).json({ error: "patientId is required" });
    }

    const patient = await Patient.findById(patientId);
    if (!patient) return res.status(404).json({ error: "Patient not found" });

    const existingPlan = await NutritionPlan.findOne({ patientId }).sort({
      createdAt: -1,
    });
    if (!existingPlan) {
      return res
        .status(404)
        .json({ error: "No extracted medical history found for this patient yet" });
    }

    const history = MedicalHistorySchema.parse(existingPlan.extractedHistory);
    const plan = await generateNutritionPlan(history);

    const newPlan = await NutritionPlan.create({
      patientId,
      extractedHistory: existingPlan.extractedHistory,
      ...plan,
    });

    res.status(201).json(newPlan);
  } catch (err) {
    next(err);
  }
}
