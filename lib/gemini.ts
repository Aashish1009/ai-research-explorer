import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Best free-tier Gemini models per task
export const GEMINI_MODELS = {
  curation: "gemini-2.5-flash",
  advanced: "gemini-2.5-flash",
} as const;

export async function generateWithGemini(
  prompt: string,
  modelName: string,
  maxOutputTokens = 8192
): Promise<string> {
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      maxOutputTokens,
    },
  });

  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.text();

  if (!text) throw new Error("Gemini returned empty response");
  return text;
}
