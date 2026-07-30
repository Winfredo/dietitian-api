import { ChatOpenAI } from "@langchain/openai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage } from "@langchain/core/messages";
import {
  MedicalHistorySchema,
  MedicalHistory,
} from "../schemas/medicalHistorySchema";
import {
  NutritionPlanSchema,
  NutritionPlan,
} from "../schemas/nutritionPlanSchema";
import { env } from "../config/env";
import { ExtractionContentBlock } from "./fileParsing.service";

export type Provider = "openai" | "gemini";

function getLLM(provider: Provider = "gemini") {
  if (provider === "gemini") {
    return new ChatGoogleGenerativeAI({
      model: "gemini-3.5-flash",
      apiKey: env.GEMINI_API_KEY,
    });
  }
  return new ChatOpenAI({
    model: "gpt-4o",
    apiKey: env.OPENAI_API_KEY,
    temperature: 0,
  });
}

export async function extractMedicalHistory(
  content: ExtractionContentBlock[],
  provider: Provider = "gemini"
): Promise<MedicalHistory> {
  const llm = getLLM(provider).withStructuredOutput(MedicalHistorySchema);
  const message = new HumanMessage({
    content: [
      {
        type: "text",
        text: "Extract all medical history details from this document into the structured schema.",
      },
      ...content,
    ],
  });
  const result = await llm.invoke([message]);
  return MedicalHistorySchema.parse(result);
}

export async function generateNutritionPlan(
  history: MedicalHistory,
  provider: Provider = "gemini"
): Promise<NutritionPlan> {
  const llm = getLLM(provider).withStructuredOutput(NutritionPlanSchema);
  const systemPrompt = `You are a registered-dietitian assistant. Given a patient's structured medical history (conditions, medications, allergies, lab results), produce a practical nutrition plan: specific foods/nutrients to avoid or limit (and why, tied to their condition), foods/nutrients to prioritize, and general health tips. Be conservative and evidence-based (e.g. low-sodium for hypertension, low-glycemic-index carbs for diabetes, avoid grapefruit with certain statins/interactions). Always include the disclaimer field.`;
  const message = new HumanMessage(
    `${systemPrompt}\n\nPatient history:\n${JSON.stringify(history)}`
  );
  const result = await llm.invoke([message]);
  return NutritionPlanSchema.parse(result);
}
