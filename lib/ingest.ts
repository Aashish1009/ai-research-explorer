import { prisma } from "./prisma";
import { fetchHFPapers, getTargetDate, HFPaper } from "./huggingface";
import { scorePaper } from "./curation";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ─── Selection constants ───────────────────────────────────────────────────────
// Always save the top-scoring paper (guarantees ≥1 per run).
// Additional papers are included if they also score >= MIN_SCORE.
const MIN_SCORE = 0.75;        // matches the curation prompt's stated threshold
const MAX_PAPERS_PER_RUN = 3;  // never more than 3 per day, no matter what

// ─── Event types streamed to the client ───────────────────────────────────────

export type IngestEvent =
  | { type: "start"; date: string; message: string }
  | { type: "fetched"; count: number; message: string }
  | { type: "scoring"; title: string; arxivId: string }
  | { type: "scored"; title: string; arxivId: string; score: number; reason: string }
  | { type: "saving"; title: string; arxivId: string; score: number }
  | { type: "saved"; title: string; arxivId: string; score: number }
  | { type: "skipped_db"; title: string; arxivId: string }
  | { type: "skipped_score"; title: string; arxivId: string; score: number; reason: string }
  | { type: "done"; added: number; rejected: number; skipped: number; total: number }
  | { type: "error"; message: string };

// ─── Main ingest pipeline ─────────────────────────────────────────────────────

export async function ingestHFPapers(
  onEvent: (event: IngestEvent) => void,
  date?: string
): Promise<{ added: number; rejected: number; skipped: number }> {
  // Use yesterday's date to ensure we always get a COMPLETE day's paper list
  const targetDate = date ?? getTargetDate();

  onEvent({
    type: "start",
    date: targetDate,
    message: `Fetching papers from HuggingFace for ${targetDate} (yesterday — ensures complete list)`,
  });

  // Step 1: Fetch all papers from HuggingFace
  let hfPapers: HFPaper[];
  try {
    hfPapers = await fetchHFPapers(targetDate);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    onEvent({ type: "error", message: `Failed to fetch HuggingFace papers: ${msg}` });
    throw e;
  }

  onEvent({
    type: "fetched",
    count: hfPapers.length,
    message: `Found ${hfPapers.length} papers on HuggingFace`,
  });

  let skipped = 0;

  // Step 2: Filter out papers already in DB
  const newPapers: HFPaper[] = [];
  for (const paper of hfPapers) {
    const exists = await prisma.paper.findUnique({
      where: { arxivId: paper.arxivId },
    });
    if (exists) {
      skipped++;
      onEvent({ type: "skipped_db", title: paper.title, arxivId: paper.arxivId });
    } else {
      newPapers.push(paper);
    }
  }

  if (newPapers.length === 0) {
    onEvent({ type: "done", added: 0, rejected: 0, skipped, total: hfPapers.length });
    return { added: 0, rejected: 0, skipped };
  }

  onEvent({
    type: "fetched",
    count: newPapers.length,
    message: `${newPapers.length} new paper${newPapers.length !== 1 ? "s" : ""} to evaluate`,
  });

  // Step 3: Score ALL new papers with the LLM
  type ScoredPaper = HFPaper & { score: number; reason: string };
  const scored: ScoredPaper[] = [];

  for (const paper of newPapers) {
    onEvent({ type: "scoring", title: paper.title, arxivId: paper.arxivId });

    const { score, reason } = await scorePaper(paper.title, paper.summary);
    scored.push({ ...paper, score, reason });

    onEvent({ type: "scored", title: paper.title, arxivId: paper.arxivId, score, reason });

    await sleep(300); // polite delay between LLM calls
  }

  // Step 4: Select only the best paper(s)
  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Always include the top paper (guarantees ≥1 per run).
  // Include additional papers only if they also score >= MIN_SCORE.
  const [topPaper, ...rest] = scored; // already sorted descending
  const extras = rest.filter((p) => p.score >= MIN_SCORE);
  const selected = [topPaper, ...extras].slice(0, MAX_PAPERS_PER_RUN);

  const rejected = scored.length - selected.length;

  // Emit rejected papers
  for (const p of scored) {
    const isSelected = selected.some((s) => s.arxivId === p.arxivId);
    if (!isSelected) {
      onEvent({
        type: "skipped_score",
        title: p.title,
        arxivId: p.arxivId,
        score: p.score,
        reason: `Score ${(p.score * 100).toFixed(0)}% — below quality threshold (${(MIN_SCORE * 100).toFixed(0)}%): ${p.reason}`,
      });
    }
  }

  // Step 5: Save selected papers to DB
  let added = 0;
  for (const paper of selected) {
    onEvent({ type: "saving", title: paper.title, arxivId: paper.arxivId, score: paper.score });

    await prisma.paper.create({
      data: {
        arxivId: paper.arxivId,
        title: paper.title,
        summary: paper.summary,
        authors: paper.authors,
        publishedAt: paper.publishedAt,
        pdfUrl: paper.pdfUrl,
        categories: paper.categories,
        qualityScore: paper.score,
        qualityReason: paper.reason,
        upvotes: paper.upvotes,
      },
    });

    added++;
    onEvent({ type: "saved", title: paper.title, arxivId: paper.arxivId, score: paper.score });
  }

  // Step 6: Log this fetch run
  await prisma.fetchLog.create({
    data: {
      fetched: hfPapers.length,
      qualified: added,
      rejected,
      skipped,
      hfDate: targetDate,
    },
  });

  onEvent({ type: "done", added, rejected, skipped, total: hfPapers.length });

  return { added, rejected, skipped };
}
