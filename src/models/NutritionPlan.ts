import { Schema, model, Document, Types } from "mongoose";
export interface INutritionPlan extends Document {
patientId: Types.ObjectId;
extractedHistory: Record<string, unknown>;
summary: string;
foodsToAvoid: Record<string, unknown>[];
nutrientsToLimit: Record<string, unknown>[];
foodsToEat: Record<string, unknown>[];
nutrientsToIncrease: Record<string, unknown>[];
healthTips: string[];
disclaimer: string;
createdAt: Date;
}
const NutritionPlanSchema = new Schema<INutritionPlan>({
patientId: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
extractedHistory: { type: Schema.Types.Mixed, required: true },
summary: { type: String, required: true },
foodsToAvoid: [{ type: Schema.Types.Mixed }],
nutrientsToLimit: [{ type: Schema.Types.Mixed }],
foodsToEat: [{ type: Schema.Types.Mixed }],
nutrientsToIncrease: [{ type: Schema.Types.Mixed }],
healthTips: [String],
disclaimer: { type: String, required: true },
createdAt: { type: Date, default: Date.now },
});
export default model<INutritionPlan>("NutritionPlan", NutritionPlanSchema);
