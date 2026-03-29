"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface BookmarkButtonProps {
  paperId: string;
  isBookmarked: boolean;
  onChange?: (paperId: string, bookmarked: boolean) => void;
}

export function BookmarkButton({ paperId, isBookmarked, onChange }: BookmarkButtonProps) {
  const [bookmarked, setBookmarked] = useState(isBookmarked);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    if (loading) return;
    setLoading(true);

    const method = bookmarked ? "DELETE" : "POST";
    try {
      const res = await fetch("/api/bookmarks", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paperId }),
      });

      if (res.ok) {
        const next = !bookmarked;
        setBookmarked(next);
        onChange?.(paperId, next);
      }
    } catch (err) {
      console.error("Bookmark toggle failed", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={bookmarked ? "Remove bookmark" : "Bookmark this paper"}
      className={cn(
        "p-1.5 rounded-lg transition-colors shrink-0",
        bookmarked
          ? "text-yellow-500 hover:text-yellow-600"
          : "text-gray-300 hover:text-gray-500",
        loading && "opacity-50 cursor-not-allowed"
      )}
    >
      <svg
        className="h-5 w-5"
        fill={bookmarked ? "currentColor" : "none"}
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M5 5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16l-7-3.5L5 21V5z"
        />
      </svg>
    </button>
  );
}
