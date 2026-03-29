import { ingestNewPapers } from "./ingest";
import { seedMustReadPapers } from "./mustread";

export interface DailyResult {
  date: string;
  newPapers: number;
  classics: number;
  alreadyDone: boolean;
}

// In-memory dedup — prevents multiple concurrent checks per server process
let lastCheckDate = "";
let lastCheckResult: DailyResult | null = null;

export async function runDailyCheck(): Promise<DailyResult> {
  const today = new Date().toISOString().split("T")[0];

  if (lastCheckDate === today && lastCheckResult) {
    return { ...lastCheckResult, alreadyDone: true };
  }

  // Mark as running immediately to block concurrent calls
  lastCheckDate = today;

  const [classics, newPapers] = await Promise.all([
    seedMustReadPapers(),
    ingestNewPapers(undefined, 100),
  ]);

  lastCheckResult = { date: today, newPapers, classics, alreadyDone: false };
  return lastCheckResult;
}
