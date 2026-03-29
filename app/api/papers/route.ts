import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ingestNewPapers } from "@/lib/ingest";

const PAGE_SIZE = 20;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const search = searchParams.get("search") ?? "";
    const category = searchParams.get("category") ?? "";
    const year = searchParams.get("year") ?? "";
    const refresh = searchParams.get("refresh") === "true";

    let added = 0;
    if (refresh) {
      added = await ingestNewPapers(category || undefined, 30);
    }

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { summary: { contains: search, mode: "insensitive" } },
      ];
    }
    if (category) where.categories = { has: category };
    if (year) {
      const yearNum = parseInt(year, 10);
      where.publishedAt = {
        gte: new Date(`${yearNum}-01-01`),
        lt: new Date(`${yearNum + 1}-01-01`),
      };
    }

    const [papers, total] = await Promise.all([
      prisma.paper.findMany({
        where,
        orderBy: { publishedAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        select: {
          id: true,
          arxivId: true,
          title: true,
          summary: true,
          authors: true,
          publishedAt: true,
          pdfUrl: true,
          categories: true,
          qualityScore: true,
        },
      }),
      prisma.paper.count({ where }),
    ]);

    return NextResponse.json({
      papers,
      added,
      pagination: {
        page,
        pageSize: PAGE_SIZE,
        total,
        totalPages: Math.ceil(total / PAGE_SIZE),
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[GET /api/papers]", msg);
    return NextResponse.json(
      { error: "Failed to fetch papers", detail: msg },
      { status: 500 }
    );
  }
}
