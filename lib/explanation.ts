import { generateWithRotation, EXPLANATION_MODELS } from "./models";

export type ExplanationLevel = "beginner" | "intermediate" | "advanced";

// The most important feature — explanations must be exhaustive and deep,
// equivalent to carefully reading the paper itself.
const EXPLANATION_PROMPT = (
  title: string,
  summary: string,
  level: ExplanationLevel
) => `
You are a world-class AI researcher and science communicator. Your task is to write a comprehensive, deeply detailed explanation of this research paper. The reader should feel they have truly READ the paper, not just skimmed an abstract.

Paper Title: ${title}
Abstract: ${summary}

Explanation Level: ${level.toUpperCase()}

Level-specific instructions:
${
  level === "beginner"
    ? `- Write for someone with zero ML or math background
- Use vivid everyday analogies for EVERY technical concept (cooking, sports, lego, puzzles, etc.)
- Avoid ALL mathematical notation and jargon — if a term must be used, explain it immediately in plain English
- Write in a warm, conversational, story-like tone that keeps curiosity alive
- Use short paragraphs (3–4 sentences max per paragraph)
- Explain WHY things work, not just WHAT they are — make the reader feel the intuition
- End each section by linking back to how it helps the reader's everyday understanding`
    : level === "intermediate"
    ? `- Write for someone who knows Python, basic ML, and has heard of gradient descent, neural networks, transformers, and loss functions
- Use moderate technical language — define niche/paper-specific terms but don't over-explain well-known basics
- Include architectural intuition: explain WHY design choices were made, not just WHAT they are
- Reference comparable prior work (BERT, GPT, ViT, diffusion models, etc.) where helpful for context
- Include enough detail that a practitioner could explain the paper to their team
- Be precise about data flows, training objectives, and evaluation setups`
    : `- Write for an ML researcher or engineer who reads papers regularly
- Go deep on ALL technical details: architecture components, loss functions, training procedures, optimizer choices, hyperparameters, data preprocessing
- Explain mathematical formulations and notation where relevant — don't shy away from equations
- Critically analyze the experimental setup: are the baselines fair? Are the ablations convincing? What do the numbers actually prove?
- Discuss connections to prior work, how this advances the field, and what it overturns
- Point out potential weaknesses, reproducibility concerns, and open questions
- Include your analysis of what follow-up work this enables`
}

Your explanation MUST cover ALL 8 sections below in FULL depth. Each section should be multiple rich paragraphs — NOT bullet-point summaries. Write the way a knowledgeable friend would explain this paper over coffee.

## 1. What Is This Paper About? (The Big Picture)
Give a complete, gripping overview of what this paper does and why it exists. What is the domain? Who cares about this problem? Set the stage so fully that even someone who has never heard of this subfield understands why this matters.

## 2. The Problem It Solves
What specific, concrete problem does this paper address? Explain the problem from first principles. Why is this problem hard? What have people tried before and why did those approaches fail or fall short? Give full historical and technical context.

## 3. The Core Idea & Key Innovation
What is the central insight or "aha moment" of this paper? What makes this approach fundamentally different from everything before it? Explain the intuition clearly before going into mechanics. This is the heart of the paper — spend serious time here.

## 4. How It Works — Step by Step
Walk through the method in enough detail that the reader could explain it to a colleague. Cover:
- The overall architecture or framework
- Each major component and what it does
- How data flows through the system
- What the training objective is and why it was chosen
- Any novel tricks, regularization, or implementation details
Do not skip steps. Do not hand-wave.

## 5. Key Results & What They Actually Prove
What benchmarks did the authors evaluate on? What were the key numbers? Which comparisons matter most? Importantly — what do these results actually PROVE about the method? Are there surprising findings? What do ablations reveal about which parts of the method are essential?

## 6. Why Is This Interesting? (Why Should You Care?)
Beyond the raw results, why is this paper exciting? What door does it open? Does it change how we think about a problem? Is it a paradigm shift, a missing piece, or a crucial engineering advance? Make the reader feel the significance.

## 7. Real-World Applications
Where can this be used in practice right now? Give concrete, specific examples across multiple domains. What kinds of products, systems, or tools could be built with this? Who would use it — researchers, companies, developers?

## 8. Limitations, Weaknesses & Open Questions
What does this approach still NOT solve? What are the known failure cases, computational costs, data requirements, or assumptions that limit applicability? What are the open questions this paper raises? What follow-up research is needed?

Be thorough. Be deep. Be genuinely informative. A reader finishing this explanation should feel they have truly understood the paper — not just skimmed it.
`.trim();

export async function generateExplanation(
  title: string,
  summary: string,
  level: ExplanationLevel
): Promise<{ content: string; model: string }> {
  const prompt = EXPLANATION_PROMPT(title, summary, level);
  return generateWithRotation(prompt, EXPLANATION_MODELS);
}
