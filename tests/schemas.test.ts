import { MedicalHistorySchema } from "../src/schemas/medicalHistorySchema";
import { NutritionPlanSchema } from "../src/schemas/nutritionPlanSchema";

describe("MedicalHistorySchema", () => {
  it("accepts a full, valid medical history", () => {
    const result = MedicalHistorySchema.safeParse({
      fullName: "Jane Doe",
      age: 45,
      sex: "female",
      conditions: [
        { name: "Type 2 Diabetes", status: "managed", diagnosedYear: "2019" },
      ],
      medications: [
        { name: "Metformin", dosage: "500mg", purpose: "blood sugar control" },
      ],
      allergies: ["penicillin"],
      labResults: [
        { test: "HbA1c", value: "6.8", unit: "%", flag: "high" },
      ],
      familyHistory: ["father: hypertension"],
      lifestyle: { smoker: false, alcoholUse: "occasional", activityLevel: "moderate" },
    });

    expect(result.success).toBe(true);
  });

  it("fills in defaults for arrays the LLM might omit", () => {
    const result = MedicalHistorySchema.safeParse({
      fullName: "Jane Doe",
      conditions: [],
      medications: [],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.allergies).toEqual([]);
      expect(result.data.labResults).toEqual([]);
      expect(result.data.familyHistory).toEqual([]);
    }
  });

  it("rejects a history missing the required fullName field", () => {
    const result = MedicalHistorySchema.safeParse({
      conditions: [],
      medications: [],
    });

    expect(result.success).toBe(false);
  });

  it("rejects a condition with a status outside the allowed enum", () => {
    const result = MedicalHistorySchema.safeParse({
      fullName: "Jane Doe",
      conditions: [{ name: "Asthma", status: "cured" }],
      medications: [],
    });

    expect(result.success).toBe(false);
  });
});

describe("NutritionPlanSchema", () => {
  it("accepts a full, valid nutrition plan", () => {
    const result = NutritionPlanSchema.safeParse({
      summary: "Focus on low-sodium, low-glycemic-index foods.",
      foodsToAvoid: [
        { item: "processed meats", reason: "high sodium", relatedCondition: "hypertension" },
      ],
      nutrientsToLimit: [{ item: "sodium", reason: "raises blood pressure" }],
      foodsToEat: [{ item: "leafy greens", reason: "high in potassium" }],
      nutrientsToIncrease: [{ item: "fiber", reason: "improves glycemic control" }],
      healthTips: ["Walk for 30 minutes most days."],
      disclaimer: "custom disclaimer text",
    });

    expect(result.success).toBe(true);
  });

  it("fills in the default disclaimer when the LLM omits it", () => {
    const result = NutritionPlanSchema.safeParse({
      summary: "Focus on low-sodium foods.",
      foodsToAvoid: [],
      nutrientsToLimit: [],
      foodsToEat: [],
      nutrientsToIncrease: [],
      healthTips: [],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.disclaimer).toMatch(/not medical advice/i);
    }
  });

  it("rejects a food item missing the required reason field", () => {
    const result = NutritionPlanSchema.safeParse({
      summary: "Focus on low-sodium foods.",
      foodsToAvoid: [{ item: "salt" }],
      nutrientsToLimit: [],
      foodsToEat: [],
      nutrientsToIncrease: [],
      healthTips: [],
    });

    expect(result.success).toBe(false);
  });
});