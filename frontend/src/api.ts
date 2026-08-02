import type { NutritionPlan, Patient } from "./types";

const API_KEY = import.meta.env.VITE_API_KEY;
const API_BASE_URL = "http://ai-dietitian-dev.eba-nhnktemu.eu-west-1.elasticbeanstalk.com";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "x-api-key": API_KEY,
      ...options.headers,
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed with status ${response.status}`);
  }
  return response.json();
}

export function uploadMedicalHistory(fullName: string, file: File) {
  const formData = new FormData();
  formData.append("fullName", fullName);
  formData.append("file", file);
  return request<{ patientId: string; status: string }>(
    "/medical-history/upload",
    {
      method: "POST",
      body: formData,
    }
  );
}

export function getPatient(patientId: string) {
  return request<Patient>(`/medical-history/${patientId}`);
}

export function getNutritionPlan(patientId: string) {
  return request<NutritionPlan>(`/nutrition/${patientId}/plan`);
}