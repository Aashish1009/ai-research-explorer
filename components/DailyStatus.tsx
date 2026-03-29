"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface DailyResult {
  date: string;       // YYYY-MM-DD
  newPapers: number;
  classics: number;
  alreadyDone: boolean;
  fetchedAt?: string; // ISO timestamp of when the fetch ran
}

const LS_KEY = "daily_check";

function nextFetch10am(): string {
  const now = new Date();
  const next = new Date(now);
  next.setDate(now.getDate() + 1);
  next.setHours(10, 0, 0, 0);
  return next.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }) + " at 10:00 AM";
}

function formatFetchedAt(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function DailyStatus() {
  const [status, setStatus] = useState<DailyResult | null>(null);
  const [checking, setChecking] = useState(false);
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    // Load from localStorage first for instant display
    const stored = localStorage.getItem(LS_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as DailyResult;
        setStatus(parsed);
        if (parsed.date === today) return; // already done today
      } catch {
        // ignore corrupted
      }
    }

    // Trigger daily check
    setChecking(true);
    fetch("/api/daily")
      .then((r) => r.json())
      .then((data: DailyResult) => {
        const withTime = { ...data, fetchedAt: new Date().toISOString() };
        localStorage.setItem(LS_KEY, JSON.stringify(withTime));
        setStatus(withTime);
        if (!data.alreadyDone && (data.newPapers > 0 || data.classics > 0)) {
          router.refresh();
        }
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nextFetchLabel = nextFetch10am();

  if (checking && !status) {
    return (
      <div className="mb-6 flex items-center gap-2 text-xs text-gray-400 animate-pulse">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-400" />
        Checking arXiv for new papers…
      </div>
    );
  }

  if (!status) return null;

  const isToday = status.date === today;
  const newPapers = status.newPapers ?? 0;
  const fetchedAt = status.fetchedAt ? formatFetchedAt(status.fetchedAt) : null;

  return (
    <div className="mb-6 rounded-xl border border-gray-100 bg-white px-4 py-3 flex flex-col gap-1 text-sm max-w-xl">
      {/* Today's result */}
      <div className="flex items-center gap-2">
        <span
          className={`inline-block h-2 w-2 rounded-full ${
            newPapers > 0 ? "bg-green-400" : "bg-gray-300"
          }`}
        />
        {!isToday ? (
          <span className="text-gray-500">
            Last checked: <span className="font-medium">{status.date}</span> — awaiting today&apos;s check
          </span>
        ) : newPapers > 0 ? (
          <span className="text-gray-700">
            Today&apos;s fetch
            {fetchedAt && <span className="text-gray-400"> ({fetchedAt})</span>}
            {" · "}
            <span className="text-green-600 font-medium">
              {newPapers} new paper{newPapers !== 1 ? "s" : ""} found
            </span>{" "}
            — appended to the list
          </span>
        ) : (
          <span className="text-gray-500">
            Checked today
            {fetchedAt && <span className="text-gray-400"> at {fetchedAt}</span>}
            {" · "}
            <span className="font-medium">0 new important papers</span> from arXiv
          </span>
        )}
      </div>

      {/* Next fetch */}
      <div className="flex items-center gap-2 text-xs text-gray-400 pl-4">
        <span>Next auto-check:</span>
        <span className="font-medium text-gray-500">{nextFetchLabel}</span>
      </div>
    </div>
  );
}
