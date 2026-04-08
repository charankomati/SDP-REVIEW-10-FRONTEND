export interface NutritionalAnalysis {
  calories?: number;
  nutrients?: Record<string, any>;
  macronutrients?: {
    protein?: number;
    carbs?: number;
    fat?: number;
  };
  healthInsights?: string;
  foodName?: string;
  predictiveRisk?: string;
  summary?: string;
}

export class AnalysisError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'AnalysisError';
  }
}

const endpoint = "/api/vision/analyze";

export async function analyzeFoodImage(base64Image: string): Promise<NutritionalAnalysis> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ base64Image }),
  });

  if (!response.ok) {
    throw new AnalysisError("Failed to analyze food image.", "API_ERROR");
  }

  return (await response.json()) as NutritionalAnalysis;
}