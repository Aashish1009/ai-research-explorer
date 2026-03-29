import { prisma } from "@/lib/prisma";
import { PaperList } from "@/components/PaperList";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bookmarks — AI Paper Explorer",
};

export default async function BookmarksPage() {
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

  const papers = bookmarks.map((b) => b.paper);
  const bookmarkedIds = new Set(papers.map((p) => p.id));

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Bookmarks</h1>
        <p className="text-gray-500 text-sm">
          {papers.length} saved paper{papers.length !== 1 ? "s" : ""}
        </p>
      </div>

      {papers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-gray-400 text-lg">No bookmarks yet.</p>
          <a href="/" className="mt-3 text-sm text-blue-600 hover:underline">
            Browse papers →
          </a>
        </div>
      ) : (
        <PaperList papers={papers} bookmarkedIds={bookmarkedIds} />
      )}
    </div>
  );
}
