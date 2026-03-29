import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const bookmarks = await prisma.bookmark.findMany({
      include: {
        paper: {
          select: {
            id: true,
            arxivId: true,
            title: true,
            summary: true,
            authors: true,
            publishedAt: true,
            categories: true,
            qualityScore: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ bookmarks });
  } catch (error) {
    console.error("[GET /api/bookmarks]", error);
    return NextResponse.json({ error: "Failed to fetch bookmarks" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { paperId } = await request.json() as { paperId?: string };
    if (!paperId) {
      return NextResponse.json({ error: "paperId is required" }, { status: 400 });
    }

    const bookmark = await prisma.bookmark.create({
      data: { paperId },
    });

    return NextResponse.json({ bookmark }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/bookmarks]", error);
    return NextResponse.json({ error: "Failed to create bookmark" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { paperId } = await request.json() as { paperId?: string };
    if (!paperId) {
      return NextResponse.json({ error: "paperId is required" }, { status: 400 });
    }

    await prisma.bookmark.deleteMany({ where: { paperId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/bookmarks]", error);
    return NextResponse.json({ error: "Failed to delete bookmark" }, { status: 500 });
  }
}
