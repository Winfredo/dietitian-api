import { Schema, model, Document } from "mongoose";
export interface IPatient extends Document {
  fullName: string;
  age?: number;
  sex?: "male" | "female" | "other";
  medicalHistoryS3Key: string;
  originalFilename: string;
  uploadedAt: Date;
  status: "processing" | "analyzed" | "failed";
}
const PatientSchema = new Schema<IPatient>({
  fullName: { type: String, required: true },
  age: Number,
  sex: { type: String, enum: ["male", "female", "other"] },
  medicalHistoryS3Key: { type: String, required: true },
  originalFilename: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ["processing", "analyzed", "failed"],
    default: "processing",
  },
});
export default model<IPatient>("Patient", PatientSchema);
