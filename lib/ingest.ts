import { prisma } from "./prisma";
import { fetchArxivPapers } from "./arxiv";
import { scorePaper, QUALITY_THRESHOLD } from "./curation";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function ingestNewPapers(category?: string, maxResults = 30): Promise<number> {
  const arxivPapers = await fetchArxivPapers(maxResults, category);
  if (arxivPapers.length === 0) return 0;

  let added = 0;

  for (const paper of arxivPapers) {
    const exists = await prisma.paper.findUnique({
      where: { arxivId: paper.arxivId },
    });
    if (exists) continue;

    const { score, reason } = await scorePaper(paper.title, paper.summary);
    await sleep(300);

    if (score < QUALITY_THRESHOLD) continue;

    await prisma.paper.create({
      data: {
        arxivId: paper.arxivId,
        title: paper.title,
        summary: paper.summary,
        authors: paper.authors,
        publishedAt: paper.publishedAt,
        pdfUrl: paper.pdfUrl,
        categories: paper.categories,
        qualityScore: score,
        qualityReason: reason,
      },
    });
    added++;
  }

  return added;
}
