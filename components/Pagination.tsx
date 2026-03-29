"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

interface PaginationProps {
  page: number;
  totalPages: number;
}

export function Pagination({ page, totalPages }: PaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  const goTo = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex items-center justify-center gap-2 mt-10">
      <button
        onClick={() => goTo(page - 1)}
        disabled={page <= 1}
        className={cn(
          "px-3 py-1.5 rounded-lg text-sm border transition",
          page <= 1
            ? "border-gray-100 text-gray-300 cursor-not-allowed"
            : "border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600"
        )}
      >
        ← Prev
      </button>

      <span className="text-sm text-gray-500 px-2">
        Page {page} of {totalPages}
      </span>

      <button
        onClick={() => goTo(page + 1)}
        disabled={page >= totalPages}
        className={cn(
          "px-3 py-1.5 rounded-lg text-sm border transition",
          page >= totalPages
            ? "border-gray-100 text-gray-300 cursor-not-allowed"
            : "border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600"
        )}
      >
        Next →
      </button>
    </div>
  );
}
