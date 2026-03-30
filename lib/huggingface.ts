// HuggingFace Papers scraper
// Primary:  https://huggingface.co/api/daily_papers?date=YYYY-MM-DD  (JSON API)
// Detail:   https://huggingface.co/api/papers/<arxivId>              (JSON API)
// Fallback: HTML scraping of the page if the API doesn't return data

import { generateWithRotation, EXPLANATION_MODELS } from "./models";

export interface HFPaper {
  arxivId: string;
  title: string;
  summary: string;
  authors: string[];
  publishedAt: Date;
  pdfUrl: string;
  categories: string[];
  upvotes: number;
}

export function getTodayDate(): string {
  return new Date().toISOString().split("T")[0]; // YYYY-MM-DD UTC
}

/**
 * Returns yesterday's date (YYYY-MM-DD UTC).
 *
 * Why yesterday? HuggingFace's daily paper list is built up throughout the day.
 * If you fetch at 10am, you only get the morning papers and miss the afternoon ones.
 * Using yesterday guarantees a complete, final snapshot — you're never
 * missing papers that arrived later in the day, and you only fall behind by 24h.
 */
export function getTargetDate(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().split("T")[0];
}

// ─── HF JSON API (primary) ────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractPaperFields(raw: any, fallbackDate: string) {
  const inner = raw?.paper ?? raw;

  const rawId: string = inner?.id ?? inner?.arxivId ?? raw?.id ?? "";
  const arxivId = rawId.replace(/^arxiv:/i, "").trim();

  const title: string = inner?.title ?? "";
  const summary: string = inner?.summary ?? inner?.abstract ?? "";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawAuthors: any[] = inner?.authors ?? [];
  const authors: string[] = rawAuthors
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((a: any) =>
      typeof a === "string" ? a : a.name ?? a.fullname ?? a.user?.fullname ?? ""
    )
    .filter(Boolean);

  const upvotes: number =
    raw?.numUpvotes ?? raw?.upvotes ?? inner?.numUpvotes ?? 0;

  const rawDate: string =
    inner?.publishedAt ?? inner?.submittedDate ?? fallbackDate;
  const publishedAt = new Date(rawDate);

  return {
    arxivId,
    title,
    summary,
    authors: authors.length > 0 ? authors : ["Unknown"],
    upvotes,
    publishedAt: isNaN(publishedAt.getTime()) ? new Date(fallbackDate) : publishedAt,
  };
}

async function fetchListingAPI(date: string): Promise<HFPaper[] | null> {
  const url = `https://huggingface.co/api/daily_papers?date=${date}`;
  console.log(`[hf] Trying API listing: ${url}`);

  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "AI-Paper-Explorer/1.0",
      },
      cache: "no-store",
    });
    if (!res.ok) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (await res.json()) as any;
    const list: unknown[] = Array.isArray(data)
      ? data
      : (data?.papers ?? data?.data ?? []);
    if (list.length === 0) return null;

    const papers: HFPaper[] = [];
    for (const item of list) {
      const f = extractPaperFields(item, date);
      if (!f.arxivId.match(/^\d{4}\.\d{4,5}(v\d+)?$/)) continue;
      if (!f.title) continue;

      papers.push({
        arxivId: f.arxivId,
        title: f.title,
        summary: f.summary, // may be empty — will be filled below
        authors: f.authors,
        publishedAt: f.publishedAt,
        pdfUrl: `https://arxiv.org/pdf/${f.arxivId}`,
        categories: ["AI"],
        upvotes: f.upvotes,
      });
    }
    return papers.length > 0 ? papers : null;
  } catch (e) {
    console.warn("[hf] Listing API failed:", e instanceof Error ? e.message : e);
    return null;
  }
}

async function fetchDetailAPI(
  arxivId: string
): Promise<{ summary: string; authors: string[]; title: string } | null> {
  const url = `https://huggingface.co/api/papers/${arxivId}`;
  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "AI-Paper-Explorer/1.0",
      },
      cache: "no-store",
    });
    if (!res.ok) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (await res.json()) as any;
    const f = extractPaperFields(data, "");
    if (!f.summary) return null;
    return { summary: f.summary, authors: f.authors, title: f.title };
  } catch {
    return null;
  }
}

// ─── HTML scraping (fallback) ─────────────────────────────────────────────────

interface HFListingEntry {
  arxivId: string;
  title: string;
  upvotes: number;
  summary?: string;
  authors?: string[];
}

function parseListingNextData(html: string): HFListingEntry[] | null {
  const match = html.match(
    /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/
  );
  if (!match) return null;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = JSON.parse(match[1]) as any;
    const list: unknown[] =
      data?.props?.pageProps?.papers ??
      data?.props?.pageProps?.dailyPapers ??
      data?.props?.pageProps?.data?.papers ??
      [];

    if (!Array.isArray(list) || list.length === 0) return null;

    const entries: HFListingEntry[] = [];
    for (const item of list) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = item as any;
      const rawId: string = raw?.id ?? raw?.paper?.id ?? "";
      const arxivId = rawId.replace(/^arxiv:/i, "").trim();
      if (!arxivId.match(/^\d{4}\.\d{4,5}(v\d+)?$/)) continue;

      entries.push({
        arxivId,
        title: raw?.title ?? raw?.paper?.title ?? arxivId,
        upvotes: raw?.numUpvotes ?? raw?.upvotes ?? raw?.paper?.numUpvotes ?? 0,
        summary:
          raw?.summary ??
          raw?.abstract ??
          raw?.paper?.summary ??
          raw?.paper?.abstract ??
          "",
        authors: (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          raw?.authors ?? raw?.paper?.authors ?? []
        )
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((a: any) =>
            typeof a === "string" ? a : a.name ?? a.user?.fullname ?? ""
          )
          .filter(Boolean),
      });
    }
    return entries.length > 0 ? entries : null;
  } catch {
    return null;
  }
}

function parseListingHtml(html: string): HFListingEntry[] {
  const entries: HFListingEntry[] = [];
  const seen = new Set<string>();

  const re = /href="\/papers\/(\d{4}\.\d{4,5}(?:v\d+)?)"/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const arxivId = m[1];
    if (!seen.has(arxivId)) {
      seen.add(arxivId);
      const ctx = html.slice(Math.max(0, m.index - 800), m.index + 800);
      const up =
        ctx.match(/"numUpvotes"\s*:\s*(\d+)/) ??
        ctx.match(/"upvotes"\s*:\s*(\d+)/);
      entries.push({
        arxivId,
        title: arxivId,
        upvotes: up ? parseInt(up[1], 10) : 0,
      });
    }
  }
  return entries;
}

async function fetchListingHtml(date: string): Promise<HFListingEntry[]> {
  const url = `https://huggingface.co/papers/date/${date}`;
  console.log(`[hf] Falling back to HTML listing: ${url}`);

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; AI-Paper-Explorer/1.0)",
      Accept: "text/html",
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HF listing page returned ${res.status}`);

  const html = await res.text();
  return parseListingNextData(html) ?? parseListingHtml(html);
}

function parseDetailHtml(
  html: string
): { summary: string; authors: string[]; title: string } {
  // Try __NEXT_DATA__ first
  const ndMatch = html.match(
    /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/
  );
  if (ndMatch) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = JSON.parse(ndMatch[1]) as any;
      const p =
        data?.props?.pageProps?.paper ?? data?.props?.pageProps?.data ?? null;
      if (p) {
        const title: string = p?.title ?? p?.paper?.title ?? "";
        const summary: string =
          p?.summary ?? p?.abstract ?? p?.paper?.summary ?? p?.paper?.abstract ?? "";
        const authors: string[] = (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          p?.authors ?? p?.paper?.authors ?? []
        )
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((a: any) =>
            typeof a === "string" ? a : a.name ?? a.user?.fullname ?? ""
          )
          .filter(Boolean);
        if (summary.length > 30) return { title, summary, authors };
      }
    } catch {
      /* fall through */
    }
  }

  // og:title / og:description fallback
  const titleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/);
  const metaMatch =
    html.match(/<meta\s+property="og:description"\s+content="([^"]{60,})"/) ??
    html.match(/<meta\s+name="description"\s+content="([^"]{60,})"/);

  return {
    title: titleMatch ? titleMatch[1].replace(/\s+/g, " ").trim() : "",
    summary: metaMatch ? metaMatch[1].replace(/\s+/g, " ").trim() : "",
    authors: [],
  };
}

async function fetchDetailHtml(
  arxivId: string
): Promise<{ summary: string; authors: string[]; title: string }> {
  const url = `https://huggingface.co/papers/${arxivId}`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; AI-Paper-Explorer/1.0)",
        Accept: "text/html",
      },
      cache: "no-store",
    });
    if (!res.ok) return { summary: "", authors: [], title: "" };
    return parseDetailHtml(await res.text());
  } catch {
    return { summary: "", authors: [], title: "" };
  }
}

// ─── AI-generated abstract fallback ──────────────────────────────────────────

async function generateAbstractWithAI(
  title: string,
  arxivId: string
): Promise<string> {
  console.log(`[hf] Generating abstract with AI for: ${title}`);
  const prompt = `A research paper titled "${title}" (arXiv ID: ${arxivId}) has no available abstract.

Based on the title alone, write a concise, plausible 3–4 sentence abstract that describes what this paper likely covers, its probable methodology, and its expected contribution to the AI/ML field. Be honest that this is an AI-inferred summary, not the actual abstract.

Start with: "Note: Abstract not available — AI-inferred summary: "`;

  try {
    const { content } = await generateWithRotation(prompt, EXPLANATION_MODELS);
    return content.trim();
  } catch {
    return `Abstract not available for "${title}". Visit huggingface.co/papers/${arxivId} for details.`;
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function fetchHFPapers(date?: string): Promise<HFPaper[]> {
  const targetDate = date ?? getTodayDate();

  // Step 1: Try JSON API for the full listing (already has summaries)
  let papers = await fetchListingAPI(targetDate);

  if (!papers || papers.length === 0) {
    // Step 2: Fall back to HTML scraping for the listing
    console.log("[hf] API listing failed, scraping HTML...");
    const entries = await fetchListingHtml(targetDate);
    if (entries.length === 0) {
      console.warn(`[hf] No papers found for ${targetDate}`);
      return [];
    }
    entries.sort((a, b) => b.upvotes - a.upvotes);
    papers = entries.map((e) => ({
      arxivId: e.arxivId,
      title: e.title || e.arxivId,
      summary: e.summary ?? "",
      authors: e.authors ?? [],
      publishedAt: new Date(targetDate),
      pdfUrl: `https://arxiv.org/pdf/${e.arxivId}`,
      categories: ["AI"],
      upvotes: e.upvotes,
    }));
  }

  papers.sort((a, b) => b.upvotes - a.upvotes);
  console.log(`[hf] Found ${papers.length} papers, enriching missing abstracts...`);

  // Step 3: Fill in missing abstracts via API → HTML → AI generation
  const BATCH = 5;
  for (let i = 0; i < papers.length; i += BATCH) {
    const batch = papers.slice(i, i + BATCH);

    await Promise.all(
      batch.map(async (paper) => {
        if (paper.summary && paper.summary.length > 50) return; // already good

        // Try JSON API for this specific paper
        const apiDetail = await fetchDetailAPI(paper.arxivId);
        if (apiDetail?.summary && apiDetail.summary.length > 50) {
          paper.summary = apiDetail.summary;
          if (apiDetail.authors.length > 0 && paper.authors[0] === "Unknown") {
            paper.authors = apiDetail.authors;
          }
          if (apiDetail.title && paper.title === paper.arxivId) {
            paper.title = apiDetail.title;
          }
          return;
        }

        // Try HTML scraping of the paper's own page
        const htmlDetail = await fetchDetailHtml(paper.arxivId);
        if (htmlDetail.summary.length > 50) {
          paper.summary = htmlDetail.summary;
          if (htmlDetail.authors.length > 0 && paper.authors[0] === "Unknown") {
            paper.authors = htmlDetail.authors;
          }
          if (htmlDetail.title && paper.title === paper.arxivId) {
            paper.title = htmlDetail.title;
          }
          return;
        }

        // Last resort: generate with AI
        paper.summary = await generateAbstractWithAI(paper.title, paper.arxivId);
      })
    );

    if (i + BATCH < papers.length) {
      await new Promise((r) => setTimeout(r, 600));
    }
  }

  return papers;
}
