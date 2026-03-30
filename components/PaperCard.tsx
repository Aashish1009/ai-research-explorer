"use client";

import Link from "next/link";
import { formatDate, formatAuthors, truncate, categoryLabel, cn } from "@/lib/utils";
import { BookmarkButton } from "./BookmarkButton";

interface Paper {
  id: string;
  arxivId: string;
  title: string;
  summary: string;
  authors: string[];
  publishedAt: string | Date;
  categories: string[];
  qualityScore?: number | null;
}

interface PaperCardProps {
  paper: Paper;
  isBookmarked?: boolean;
  onBookmarkChange?: (paperId: string, bookmarked: boolean) => void;
}

export function PaperCard({ paper, isBookmarked, onBookmarkChange }: PaperCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-md transition-all duration-200 flex flex-col gap-3">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {paper.categories.slice(0, 3).map((cat) => (
            <span
              key={cat}
              className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100"
            >
              {categoryLabel(cat)}
            </span>
          ))}
        </div>
        <BookmarkButton
          paperId={paper.id}
          isBookmarked={isBookmarked ?? false}
          onChange={onBookmarkChange}
        />
      </div>

      {/* Title */}
      <Link href={`/paper/${paper.id}`} className="group">
        <h2 className="text-base font-semibold text-gray-900 group-hover:text-blue-600 transition-colors leading-snug">
          {paper.title}
        </h2>
      </Link>

      {/* Summary */}
      <p className="text-sm text-gray-600 leading-relaxed">
        {truncate(paper.summary, 220)}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-400 mt-auto pt-1 border-t border-gray-100">
        <span>{formatAuthors(paper.authors)}</span>
        <div className="flex items-center gap-3">
          {paper.qualityScore != null && (
            <span
              className={cn(
                "font-medium",
                paper.qualityScore >= 0.9
                  ? "text-green-600"
                  : paper.qualityScore >= 0.75
                  ? "text-blue-600"
                  : "text-gray-400"
              )}
            >
              ★ {(paper.qualityScore * 100).toFixed(0)}
            </span>
          )}
          <span suppressHydrationWarning>{formatDate(paper.publishedAt)}</span>
        </div>
      </div>
    </div>
  );
}
