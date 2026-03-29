export interface ArxivPaper {
  arxivId: string;
  title: string;
  summary: string;
  authors: string[];
  publishedAt: Date;
  pdfUrl: string;
  categories: string[];
}

const ARXIV_API = "https://export.arxiv.org/api/query";

// Best AI/ML categories to fetch from
const AI_CATEGORIES = [
  "cs.AI",
  "cs.LG",
  "cs.CL",
  "cs.CV",
  "stat.ML",
];

function parseArxivXML(xml: string): ArxivPaper[] {
  const papers: ArxivPaper[] = [];

  // Extract each entry block
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;

  while ((match = entryRegex.exec(xml)) !== null) {
    const entry = match[1];

    const idMatch = entry.match(/<id>https?:\/\/arxiv\.org\/abs\/([^<]+)<\/id>/);
    const titleMatch = entry.match(/<title>([\s\S]*?)<\/title>/);
    const summaryMatch = entry.match(/<summary>([\s\S]*?)<\/summary>/);
    const publishedMatch = entry.match(/<published>([^<]+)<\/published>/);
    const pdfMatch = entry.match(
      /<link[^>]+title="pdf"[^>]+href="([^"]+)"[^>]*\/>/
    );

    if (!idMatch || !titleMatch || !summaryMatch || !publishedMatch) continue;

    const arxivId = idMatch[1].trim();
    const title = titleMatch[1].replace(/\s+/g, " ").trim();
    const summary = summaryMatch[1].replace(/\s+/g, " ").trim();
    const publishedAt = new Date(publishedMatch[1].trim());
    const pdfUrl = pdfMatch
      ? pdfMatch[1].trim()
      : `https://arxiv.org/pdf/${arxivId}`;

    // Extract authors
    const authorRegex = /<author>[\s\S]*?<name>([^<]+)<\/name>[\s\S]*?<\/author>/g;
    const authors: string[] = [];
    let authorMatch;
    while ((authorMatch = authorRegex.exec(entry)) !== null) {
      authors.push(authorMatch[1].trim());
    }

    // Extract categories
    const categoryRegex = /<category[^>]+term="([^"]+)"[^>]*\/>/g;
    const categories: string[] = [];
    let catMatch;
    while ((catMatch = categoryRegex.exec(entry)) !== null) {
      categories.push(catMatch[1].trim());
    }

    papers.push({
      arxivId,
      title,
      summary,
      authors,
      publishedAt,
      pdfUrl,
      categories,
    });
  }

  return papers;
}

export async function fetchArxivPapers(
  maxResults = 50,
  category?: string
): Promise<ArxivPaper[]> {
  // Build URL manually — URLSearchParams encodes ":" as "%3A" which arXiv rejects.
  // arXiv expects literal "cat:cs.AI+OR+cat:cs.LG" in the query string.
  const searchQuery = category
    ? `cat:${category}`
    : AI_CATEGORIES.map((c) => `cat:${c}`).join("+OR+");

  const url = `${ARXIV_API}?search_query=${searchQuery}&start=0&max_results=${maxResults}&sortBy=submittedDate&sortOrder=descending`;

  const response = await fetch(url, {
    headers: { "User-Agent": "AI-Paper-Explorer/1.0" },
    cache: "no-store",
  });

  if (!response.ok) {
    if (response.status === 429) {
      console.warn("arXiv rate limit hit — skipping fetch");
      return [];
    }
    throw new Error(`arXiv API error: ${response.status}`);
  }

  const xml = await response.text();
  return parseArxivXML(xml);
}
