import { Schema, model, Document } from "mongoose";
export interface INutritionPlan extends Document {
patientId: Schema.Types.ObjectId;
extractedHistory: Record<string, unknown>;
foodsToAvoid: Record<string, unknown>[];
foodsToEat: Record<string, unknown>[];
healthTips: string[];
createdAt: Date;
}
const NutritionPlanSchema = new Schema<INutritionPlan>({
patientId: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
extractedHistory: { type: Schema.Types.Mixed, required: true },
foodsToAvoid: [{ type: Schema.Types.Mixed }],
foodsToEat: [{ type: Schema.Types.Mixed }],
healthTips: [String],
createdAt: { type: Date, default: Date.now },
});
export default model<INutritionPlan>("NutritionPlan", NutritionPlanSchema);