// Automatic daily fetch has been removed.
// Papers are fetched manually via the "Run Now" button on the home page.
// This file is kept as a stub so existing imports don't break at compile time.

export interface DailyResult {
  date: string;
  newPapers: number;
  classics: number;
  alreadyDone: boolean;
}

export async function runDailyCheck(): Promise<DailyResult> {
  return {
    date: new Date().toISOString().split("T")[0],
    newPapers: 0,
    classics: 0,
    alreadyDone: true,
  };
}
