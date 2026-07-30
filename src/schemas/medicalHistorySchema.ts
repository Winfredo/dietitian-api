import { z } from "zod";

export const ConditionSchema = z.object({
  name: z.string().describe("e.g. Type 2 Diabetes, Hypertension"),
  status: z.enum(["active", "managed", "resolved"]),
  diagnosedYear: z.string().optional(),
});

export const MedicationSchema = z.object({
  name: z.string(),
  dosage: z.string().optional(),
  purpose: z.string().optional(),
});

export const MedicalHistorySchema = z.object({
  fullName: z.string(),
  age: z.number().optional(),
  sex: z.enum(["male", "female", "other"]).optional(),
  conditions: z.array(ConditionSchema),
  medications: z.array(MedicationSchema),
  allergies: z.array(z.string()).default([]),
  labResults: z
    .array(
      z.object({
        test: z.string(),
        value: z.string(),
        unit: z.string().optional(),
        flag: z.enum(["low", "normal", "high"]).optional(),
      })
    )
    .default([]),
  familyHistory: z.array(z.string()).default([]),
  lifestyle: z
    .object({
      smoker: z.boolean().optional(),
      alcoholUse: z.string().optional(),
      activityLevel: z.string().optional(),
    })
    .optional(),
});

export type MedicalHistory = z.infer<typeof MedicalHistorySchema>;
