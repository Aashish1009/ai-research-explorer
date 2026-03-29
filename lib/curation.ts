import { generateWithGemini, GEMINI_MODELS } from "./gemini";
import { generateWithGroq, GROQ_MODELS } from "./groq";

interface CurationResult {
  score: number;
  reason: string;
}

const CURATION_PROMPT = (title: string, summary: string) => `
You are an expert AI research curator. Your job is to score this paper strictly and objectively.

Title: ${title}
Abstract: ${summary}

Score this paper from 0.0 to 1.0 based on:
1. Novelty — Is this a genuinely new idea or significant advancement? (not incremental)
2. Clarity — Is the contribution clearly stated and well-scoped?
3. Real-world applicability — Does it solve something useful beyond academia?
4. Field impact — Would serious AI researchers care about this?

Scoring guide:
- 0.90–1.00: Landmark paper, clear breakthrough
- 0.75–0.89: High-quality, notable contribution, worth featuring
- 0.50–0.74: Solid but not exceptional
- 0.00–0.49: Incremental, niche, or unclear contribution

Only papers scoring >= 0.75 will be shown to users.

Respond with ONLY valid JSON, no markdown, no explanation outside JSON:
{"score": 0.85, "reason": "One sentence explaining the score."}
`.trim();

function parseScore(raw: string): CurationResult {
  const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const parsed = JSON.parse(cleaned) as CurationResult;
  if (typeof parsed.score !== "number" || typeof parsed.reason !== "string") {
    throw new Error("Invalid curation response shape");
  }
  return { score: Math.min(1, Math.max(0, parsed.score)), reason: parsed.reason };
}

export async function scorePaper(
  title: string,
  summary: string
): Promise<CurationResult> {
  const prompt = CURATION_PROMPT(title, summary);

  // Try Gemini first
  try {
    const raw = await generateWithGemini(prompt, GEMINI_MODELS.curation);
    return parseScore(raw);
  } catch (e) {
    console.warn("Gemini curation failed, falling back to Groq:", e instanceof Error ? e.message : e);
  }

  // Fallback to Groq
  try {
    const raw = await generateWithGroq(prompt, GROQ_MODELS.relevance, 256);
    return parseScore(raw);
  } catch (e) {
    console.warn("Groq curation also failed, using default score:", e instanceof Error ? e.message : e);
  }

  // If both LLMs fail, accept the paper with a neutral score
  // (it came from a curated arXiv AI category, so it's likely relevant)
  return { score: 0.8, reason: "Auto-accepted: curation LLMs unavailable." };
}

export const QUALITY_THRESHOLD = 0.75;
