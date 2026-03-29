import { generateWithGroq, GROQ_MODELS } from "./groq";
import { generateWithGemini, GEMINI_MODELS } from "./gemini";

export type ExplanationLevel = "beginner" | "intermediate" | "advanced";

// The most important feature — explanations must be exhaustive and deep,
// equivalent to carefully reading the paper itself.
const EXPLANATION_PROMPT = (
  title: string,
  summary: string,
  level: ExplanationLevel
) => `
You are an expert AI researcher and educator. Your task is to write a thorough, detailed explanation of the following research paper.

Paper Title: ${title}
Abstract: ${summary}

Explanation Level: ${level.toUpperCase()}

Level-specific instructions:
${
  level === "beginner"
    ? `- Write for someone with zero ML background
- Use everyday analogies (cooking, sports, building blocks, etc.) for every concept
- Avoid all mathematical notation and jargon
- Every technical term must be immediately explained in plain language
- Use short paragraphs and simple sentence structure
- Make it engaging and story-like where possible`
    : level === "intermediate"
    ? `- Write for someone who knows Python and has basic ML knowledge (knows what gradient descent, neural networks, and loss functions are)
- Use moderate technical language — define niche terms but don't over-explain basics
- Include architecture intuition but skip heavy math derivations
- Discuss why design choices were made, not just what they are
- Reference comparable prior work where helpful`
    : `- Write for an ML practitioner or researcher who reads papers regularly
- Go deep: explain architectural details, loss functions, training procedures, hyperparameter choices
- Discuss mathematical formulations where relevant
- Critically analyze the experimental setup, baselines, and ablations
- Point out potential weaknesses, edge cases, or open questions
- Compare with related work in the field`
}

Your explanation MUST cover ALL of the following sections in full detail. Each section should be multiple paragraphs — do not give brief bullet-point summaries:

## 1. The Problem
What specific problem does this paper address? Why is this problem hard? What were the limitations of prior approaches? Give full context so the reader understands why this paper was worth writing.

## 2. The Core Idea
What is the central insight or innovation? Explain the "aha moment" of the paper. What makes this approach different from everything that came before it?

## 3. How It Works
Walk through the method step by step. Cover the architecture, algorithm, or framework in enough detail that the reader could explain it to someone else. Do not skip steps or hand-wave details.

## 4. Key Results & Why They Matter
What did the authors show empirically? Which benchmarks, metrics, and comparisons are most important? What do the results actually prove about the method?

## 5. Real-World Applications
Where can this method be used in practice? Give concrete, specific use cases across multiple domains if applicable. What kinds of products or systems could be built with this?

## 6. Limitations & Open Questions
What does this approach still not solve? What are the known failure cases, computational costs, or assumptions that limit applicability? What follow-up work is needed?

Be thorough. A reader finishing this explanation should feel they have truly understood the paper — not just skimmed it.
`.trim();

interface ModelConfig {
  provider: "groq" | "gemini";
  model: string;
  maxTokens?: number;
}

const MODEL_FOR_LEVEL: Record<ExplanationLevel, ModelConfig> = {
  beginner: { provider: "groq", model: GROQ_MODELS.beginner, maxTokens: 6000 },
  intermediate: { provider: "groq", model: GROQ_MODELS.intermediate, maxTokens: 8000 },
  advanced: { provider: "gemini", model: GEMINI_MODELS.advanced },
};

export async function generateExplanation(
  title: string,
  summary: string,
  level: ExplanationLevel
): Promise<{ content: string; model: string }> {
  const prompt = EXPLANATION_PROMPT(title, summary, level);
  const config = MODEL_FOR_LEVEL[level];

  let content: string;

  if (config.provider === "groq") {
    content = await generateWithGroq(prompt, config.model, config.maxTokens);
  } else {
    content = await generateWithGemini(prompt, config.model);
  }

  return { content, model: config.model };
}
