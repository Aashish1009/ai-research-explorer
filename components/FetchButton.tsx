"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

const COOLDOWN_MS = 60 * 60 * 1000; // 1 hour
const LS_KEY = "papers_last_fetched";

function useLastFetched() {
  const [lastFetched, setLastFetched] = useState<number | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(LS_KEY);
    if (stored) setLastFetched(parseInt(stored, 10));
  }, []);

  const save = useCallback((ts: number) => {
    localStorage.setItem(LS_KEY, String(ts));
    setLastFetched(ts);
  }, []);

  const clear = useCallback(() => {
    localStorage.removeItem(LS_KEY);
    setLastFetched(null);
  }, []);

  return { lastFetched, save, clear };
}

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function formatRelative(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

export function FetchButton() {
  const [fetching, setFetching] = useState(false);
  const [result, setResult] = useState<{ newPapers: number; classics: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { lastFetched, save, clear } = useLastFetched();
  const now = useNow();
  const router = useRouter();

  const elapsed = lastFetched ? now - lastFetched : null;
  const cooldownLeft = elapsed !== null ? Math.max(0, COOLDOWN_MS - elapsed) : 0;
  const onCooldown = cooldownLeft > 0;

  const doFetch = async () => {
    if (fetching || onCooldown) return;
    setFetching(true);
    setError(null);
    setResult(null);

    try {
      // Run both in parallel: seed classics + fetch new arXiv papers
      const [seedRes, papersRes] = await Promise.all([
        fetch("/api/seed", { method: "POST" }),
        fetch("/api/papers?refresh=true"),
      ]);

      const seedData = (await seedRes.json()) as { added?: number; error?: string };
      const papersData = (await papersRes.json()) as { added?: number; detail?: string };

      if (!papersRes.ok) {
        throw new Error(papersData.detail ?? `arXiv fetch failed (HTTP ${papersRes.status})`);
      }

      const newPapers = papersData.added ?? 0;
      const classics = seedData.added ?? 0;
      const total = newPapers + classics;

      setResult({ newPapers, classics });
      if (total > 0) save(Date.now());

      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setFetching(false);
    }
  };

  const statusLine = (() => {
    if (fetching) return null;
    if (error)
      return (
        <span className="text-red-400" title={error}>
          ✗ {error}
        </span>
      );
    if (result) {
      const parts = [];
      if (result.newPapers > 0) parts.push(`${result.newPapers} new paper${result.newPapers !== 1 ? "s" : ""} from arXiv`);
      if (result.classics > 0) parts.push(`${result.classics} classic${result.classics !== 1 ? "s" : ""} added`);
      const msg = parts.length > 0 ? parts.join(" · ") : "No new papers this time";
      return (
        <span className={parts.length > 0 ? "text-green-600" : "text-gray-400"}>
          ✓ {msg}
          {onCooldown && ` · next in ${formatRelative(cooldownLeft)}`}
        </span>
      );
    }
    if (onCooldown && elapsed !== null)
      return (
        <span className="text-gray-400">
          Updated {formatRelative(elapsed)} ago · next in {formatRelative(cooldownLeft)}
        </span>
      );
    if (elapsed !== null && !onCooldown)
      return <span className="text-blue-500">Ready — last fetched {formatRelative(elapsed)} ago</span>;
    return <span className="text-gray-400">Click to load papers from arXiv + add classic AI papers</span>;
  })();

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={doFetch}
        disabled={fetching || onCooldown}
        title={onCooldown ? `Next fetch available in ${formatRelative(cooldownLeft)}` : "Fetch new papers from arXiv and seed classic AI papers"}
        className={
          fetching || onCooldown
            ? "text-sm px-3 py-2 rounded-lg border border-gray-100 text-gray-300 cursor-not-allowed whitespace-nowrap"
            : "text-sm px-3 py-2 rounded-lg border border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600 transition whitespace-nowrap"
        }
      >
        {fetching
          ? "↻ Fetching papers…"
          : onCooldown
          ? `↻ Fetch (${formatRelative(cooldownLeft)})`
          : "↻ Fetch papers"}
      </button>
      {statusLine && <p className="text-xs pl-1">{statusLine}</p>}
    </div>
  );
}
