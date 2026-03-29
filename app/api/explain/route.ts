import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateExplanation, ExplanationLevel } from "@/lib/explanation";

const VALID_LEVELS: ExplanationLevel[] = ["beginner", "intermediate", "advanced"];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { paperId?: string; level?: string };
    const { paperId, level } = body;

    if (!paperId || typeof paperId !== "string") {
      return NextResponse.json({ error: "paperId is required" }, { status: 400 });
    }

    if (!level || !VALID_LEVELS.includes(level as ExplanationLevel)) {
      return NextResponse.json(
        { error: "level must be one of: beginner, intermediate, advanced" },
        { status: 400 }
      );
    }

    const explLevel = level as ExplanationLevel;

    // Return cached explanation if it exists
    const existing = await prisma.explanation.findUnique({
      where: { paperId_level: { paperId, level: explLevel } },
    });
    if (existing) {
      return NextResponse.json({ explanation: existing, cached: true });
    }

    // Fetch the paper
    const paper = await prisma.paper.findUnique({ where: { id: paperId } });
    if (!paper) {
      return NextResponse.json({ error: "Paper not found" }, { status: 404 });
    }

    // Generate explanation with the appropriate LLM
    const { content, model } = await generateExplanation(
      paper.title,
      paper.summary,
      explLevel
    );

    // Persist it
    const explanation = await prisma.explanation.create({
      data: { paperId, level: explLevel, content, model },
    });

    return NextResponse.json({ explanation, cached: false });
  } catch (error) {
    console.error("[POST /api/explain]", error);
    return NextResponse.json(
      { error: "Failed to generate explanation" },
      { status: 500 }
    );
  }
}
