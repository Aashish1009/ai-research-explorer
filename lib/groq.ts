import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Best free-tier Groq models per task
export const GROQ_MODELS = {
  beginner: "llama-3.3-70b-versatile",
  intermediate: "llama-3.3-70b-versatile",
  relevance: "llama-3.3-70b-versatile",
} as const;

export async function generateWithGroq(
  prompt: string,
  model: string,
  maxTokens = 4096
): Promise<string> {
  const completion = await groq.chat.completions.create({
    model,
    messages: [{ role: "user", content: prompt }],
    max_tokens: maxTokens,
    temperature: 0.7,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("Groq returned empty response");
  return content;
}
