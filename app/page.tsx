import { Suspense } from "react";
import { SearchBar } from "@/components/SearchBar";
import { FilterBar } from "@/components/FilterBar";
import { PaperList } from "@/components/PaperList";
import { Pagination } from "@/components/Pagination";
import { PageSkeleton } from "@/components/LoadingSkeleton";
import { FetchButton } from "@/components/FetchButton";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 20;

interface HomeProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    category?: string;
    year?: string;
  }>;
}

async function PapersSection({ searchParams }: HomeProps) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const search = params.search ?? "";
  const category = params.category ?? "";
  const year = params.year ?? "";

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { summary: { contains: search, mode: "insensitive" } },
    ];
  }
  if (category) where.categories = { has: category };
  if (year) {
    const y = parseInt(year, 10);
    where.publishedAt = {
      gte: new Date(`${y}-01-01`),
      lt: new Date(`${y + 1}-01-01`),
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
        categories: true,
        qualityScore: true,
        upvotes: true,
      },
    }),
    prisma.paper.count({ where }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <>
      <div className="text-sm text-gray-400 mb-4">
        {total === 0
          ? "No papers yet — click Run Now above to fetch today's papers from HuggingFace."
          : `${total} curated paper${total !== 1 ? "s" : ""}`}
      </div>
      <PaperList papers={papers} />
      <Pagination page={page} totalPages={totalPages} />
    </>
  );
}

export default function HomePage({ searchParams }: HomeProps) {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-1">
          AI Paper Explorer
        </h1>
        <p className="text-gray-500 text-base">
          Top AI research papers from HuggingFace — curated by LLM, explained at every level.
        </p>
      </div>

      {/* Manual fetch trigger — streams live as papers are scored */}
      <FetchButton />

      <div className="flex flex-wrap items-center gap-3 mb-8">
        <Suspense>
          <SearchBar />
        </Suspense>
        <Suspense>
          <FilterBar />
        </Suspense>
      </div>

      <Suspense fallback={<PageSkeleton />}>
        <PapersSection searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
