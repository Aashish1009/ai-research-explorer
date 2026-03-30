import { generateWithGemini } from "./gemini";
import { generateWithGroq } from "./groq";

export interface ModelSpec {
  provider: "groq" | "gemini";
  model: string;
  maxTokens?: number;      // used for Groq
  maxOutputTokens?: number; // used for Gemini
  label: string;
}

// All free-tier models in priority order — best quality first
export const CURATION_MODELS: ModelSpec[] = [
  { provider: "gemini", model: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { provider: "groq", model: "llama-3.3-70b-versatile", maxTokens: 1024, label: "Llama 3.3 70B" },
  { provider: "groq", model: "mixtral-8x7b-32768", maxTokens: 1024, label: "Mixtral 8x7B" },
  { provider: "groq", model: "gemma2-9b-it", maxTokens: 1024, label: "Gemma2 9B" },
];

export const EXPLANATION_MODELS: ModelSpec[] = [
  // Gemini models first — higher free-tier limits, longer outputs
  { provider: "gemini", model: "gemini-2.5-flash", maxOutputTokens: 8192, label: "Gemini 2.5 Flash" },
  { provider: "gemini", model: "gemini-2.0-flash", maxOutputTokens: 8192, label: "Gemini 2.0 Flash" },
  { provider: "gemini", model: "gemini-1.5-flash", maxOutputTokens: 8192, label: "Gemini 1.5 Flash" },
  // Groq fallbacks — capped at 4096 to stay within free-tier TPM limits
  { provider: "groq", model: "llama-3.3-70b-versatile", maxTokens: 4096, label: "Llama 3.3 70B" },
  { provider: "groq", model: "mixtral-8x7b-32768", maxTokens: 4096, label: "Mixtral 8x7B" },
  { provider: "groq", model: "llama3-70b-8192", maxTokens: 4096, label: "Llama3 70B" },
  { provider: "groq", model: "gemma2-9b-it", maxTokens: 4096, label: "Gemma2 9B" },
];

function isRateLimitError(e: unknown): boolean {
  if (!(e instanceof Error)) return false;
  const msg = e.message.toLowerCase();
  return (
    msg.includes("429") ||
    msg.includes("rate limit") ||
    msg.includes("rate_limit") ||
    msg.includes("quota") ||
    msg.includes("resource_exhausted") ||
    msg.includes("too many requests") ||
    msg.includes("tokens per") ||
    msg.includes("requests per")
  );
}

export async function generateWithRotation(
  prompt: string,
  models: ModelSpec[]
): Promise<{ content: string; model: string }> {
  const errors: string[] = [];

  for (const spec of models) {
    try {
      let content: string;
      if (spec.provider === "gemini") {
        content = await generateWithGemini(prompt, spec.model, spec.maxOutputTokens);
      } else {
        content = await generateWithGroq(prompt, spec.model, spec.maxTokens);
      }
      return { content, model: spec.model };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`${spec.label}: ${msg}`);

      if (isRateLimitError(e)) {
        console.warn(`[models] ${spec.label} rate limited — rotating to next model`);
        continue; // Try next model
      }

      // Non-rate-limit error — still try next model but log it
      console.warn(`[models] ${spec.label} failed (${msg}) — rotating to next model`);
      continue;
    }
  }

  throw new Error(`All models exhausted.\n${errors.join("\n")}`);
}
