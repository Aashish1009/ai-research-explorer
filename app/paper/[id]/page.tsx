import { notFound } from "next/navigation";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { formatDate, formatAuthors, categoryLabel } from "@/lib/utils";
import { ExplanationTabs } from "@/components/ExplanationTabs";
import { ExplanationSkeleton } from "@/components/LoadingSkeleton";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const paper = await prisma.paper.findUnique({
    where: { id },
    select: { title: true, summary: true },
  });

  if (!paper) return { title: "Paper not found" };

  return {
    title: `${paper.title} — AI Paper Explorer`,
    description: paper.summary.slice(0, 200),
  };
}

export default async function PaperPage({ params }: Props) {
  const { id } = await params;

  const paper = await prisma.paper.findUnique({
    where: { id },
  });

  if (!paper) notFound();

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Back link */}
      <a
        href="/"
        className="inline-flex items-center text-sm text-gray-400 hover:text-blue-600 transition mb-6"
      >
        ← Back to papers
      </a>

      {/* Categories */}
      <div className="flex flex-wrap gap-2 mb-4">
        {paper.categories.map((cat) => (
          <span
            key={cat}
            className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100"
          >
            {categoryLabel(cat)}
          </span>
        ))}
        {paper.qualityScore != null && (
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-100">
            ★ Quality {(paper.qualityScore * 100).toFixed(0)}%
          </span>
        )}
      </div>

      {/* Title */}
      <h1 className="text-2xl font-bold text-gray-900 leading-snug mb-3">
        {paper.title}
      </h1>

      {/* Meta */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-6">
        <span>{formatAuthors(paper.authors, 5)}</span>
        <span>·</span>
        <span>{formatDate(paper.publishedAt)}</span>
        <span>·</span>
        <a
          href={paper.pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline font-medium"
        >
          View PDF ↗
        </a>
        <a
          href={`https://arxiv.org/abs/${paper.arxivId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline font-medium"
        >
          arXiv ↗
        </a>
      </div>

      {/* Abstract */}
      <div className="bg-white border border-gray-100 rounded-xl p-5 mb-2">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Abstract
        </h2>
        <p className="text-sm text-gray-700 leading-relaxed">{paper.summary}</p>
      </div>

      {/* Quality reason */}
      {paper.qualityReason && (
        <p className="text-xs text-gray-400 italic px-1 mb-6">
          Why curated: {paper.qualityReason}
        </p>
      )}

      {/* Explanations */}
      <Suspense fallback={<ExplanationSkeleton />}>
        <ExplanationTabs paperId={paper.id} />
      </Suspense>
    </div>
  );
}
