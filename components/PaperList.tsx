"use client";

import { useState, useCallback } from "react";
import { PaperCard } from "./PaperCard";
import { PaperCardSkeleton } from "./LoadingSkeleton";

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

interface PaperListProps {
  papers: Paper[];
  bookmarkedIds?: Set<string>;
  loading?: boolean;
}

export function PaperList({ papers, bookmarkedIds, loading = false }: PaperListProps) {
  const [localBookmarks, setLocalBookmarks] = useState<Set<string>>(
    bookmarkedIds ?? new Set()
  );

  const handleBookmarkChange = useCallback((paperId: string, bookmarked: boolean) => {
    setLocalBookmarks((prev) => {
      const next = new Set(prev);
      if (bookmarked) {
        next.add(paperId);
      } else {
        next.delete(paperId);
      }
      return next;
    });
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <PaperCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (papers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-gray-400 text-lg">No papers found.</p>
        <p className="text-gray-300 text-sm mt-1">Try adjusting your filters or search.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {papers.map((paper) => (
        <PaperCard
          key={paper.id}
          paper={paper}
          isBookmarked={localBookmarks.has(paper.id)}
          onBookmarkChange={handleBookmarkChange}
        />
      ))}
    </div>
  );
}
