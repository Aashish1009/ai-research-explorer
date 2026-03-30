"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { IngestEvent } from "@/lib/ingest";

const LS_KEY = "hf_fetch_unlocks_at";

/** Compute timestamp of 10:00 AM tomorrow */
function next10amTimestamp(): number {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  return d.getTime();
}

function formatCountdown(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

interface LogLine {
  key: number;
  icon: string;
  text: string;
  accent?: "green" | "red" | "gray" | "blue" | "yellow";
}

let lineKey = 0;

export function FetchButton() {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<LogLine[]>([]);
  const [unlocksAt, setUnlocksAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const logEndRef = useRef<HTMLDivElement>(null);
  const esRef = useRef<EventSource | null>(null);

  // Load cooldown from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(LS_KEY);
    if (stored) setUnlocksAt(parseInt(stored, 10));
  }, []);

  // Tick every second for countdown
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Auto-scroll log to bottom
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [log]);

  const addLine = useCallback((icon: string, text: string, accent?: LogLine["accent"]) => {
    setLog((prev) => [...prev, { key: lineKey++, icon, text, accent }]);
  }, []);

  const isLocked = unlocksAt !== null && now < unlocksAt;
  const cooldownLeft = isLocked ? unlocksAt! - now : 0;

  const run = () => {
    if (running || isLocked) return;

    setRunning(true);
    setDone(false);
    setError(null);
    setLog([]);

    const es = new EventSource("/api/fetch");
    esRef.current = es;

    es.onmessage = (e: MessageEvent) => {
      try {
        const event = JSON.parse(e.data as string) as IngestEvent;

        switch (event.type) {
          case "start":
            addLine("🌐", `Fetching papers from HuggingFace for ${event.date} (yesterday — complete list)…`, "blue");
            break;

          case "fetched":
            addLine(
              "📄",
              `${event.message}`,
              event.count > 0 ? "blue" : "gray"
            );
            break;

          case "scoring":
            addLine("⟳", `Scoring: "${event.title}"`, "yellow");
            break;

          case "scored":
            addLine(
              event.score >= 0.90 ? "★" : "·",
              `Score ${(event.score * 100).toFixed(0)}%: "${event.title}"`,
              event.score >= 0.90 ? "green" : "gray"
            );
            break;

          case "saving":
            addLine("↑", `Saving to DB: "${event.title}"`, "blue");
            break;

          case "saved":
            addLine("✓", `Added: "${event.title}" (${(event.score * 100).toFixed(0)}%)`, "green");
            break;

          case "skipped_db":
            addLine("↷", `Already in DB: "${event.title}"`, "gray");
            break;

          case "skipped_score":
            addLine(
              "✗",
              `Not top-tier (${(event.score * 100).toFixed(0)}%): "${event.title}"`,
              "red"
            );
            break;

          case "done": {
            const parts: string[] = [];
            if (event.added > 0) parts.push(`${event.added} added`);
            if (event.rejected > 0) parts.push(`${event.rejected} rejected`);
            if (event.skipped > 0) parts.push(`${event.skipped} already present`);
            addLine(
              "🎉",
              `Done! ${parts.join(" · ") || "No new papers today"}`,
              "green"
            );

            // Lock button until 10am tomorrow — only after a successful run
            const unlock = next10amTimestamp();
            localStorage.setItem(LS_KEY, String(unlock));
            setUnlocksAt(unlock);

            es.close();
            setRunning(false);
            setDone(true);
            router.refresh();
            break;
          }

          case "error":
            addLine("✗", `Error: ${event.message}`, "red");
            setError(event.message);
            es.close();
            setRunning(false);
            break;
        }
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      if (running) {
        addLine("✗", "Connection to server lost.", "red");
        setError("Stream disconnected.");
      }
      es.close();
      setRunning(false);
    };
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      esRef.current?.close();
    };
  }, []);

  const accentClass: Record<NonNullable<LogLine["accent"]>, string> = {
    green: "text-emerald-600",
    red: "text-red-500",
    gray: "text-gray-400",
    blue: "text-blue-500",
    yellow: "text-amber-500",
  };

  return (
    <div className="mb-8 rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      {/* Header row */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
        <div>
          <p className="text-sm font-semibold text-gray-800">
            HuggingFace Papers — Today&apos;s Feed
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            Fetches yesterday&apos;s complete list · scores every paper · saves only the best
          </p>
        </div>

        <div className="flex flex-col items-end gap-1">
          <button
            onClick={run}
            disabled={running || isLocked}
            className={[
              "px-4 py-2 rounded-xl text-sm font-medium transition-all",
              running
                ? "bg-blue-50 text-blue-400 cursor-not-allowed"
                : isLocked
                ? "bg-gray-50 text-gray-300 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700 active:scale-95 shadow-sm",
            ].join(" ")}
          >
            {running ? (
              <span className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
                Running…
              </span>
            ) : isLocked ? (
              `Locked · ${formatCountdown(cooldownLeft)}`
            ) : (
              "▶ Run Now"
            )}
          </button>

          {isLocked && !running && (
            <p className="text-xs text-gray-400">
              Unlocks at 10:00 AM tomorrow
            </p>
          )}
        </div>
      </div>

      {/* Live log stream */}
      {log.length > 0 && (
        <div className="px-5 py-3 max-h-72 overflow-y-auto bg-gray-50 font-mono text-xs space-y-1">
          {log.map((line) => (
            <div key={line.key} className={`flex gap-2 leading-relaxed ${line.accent ? accentClass[line.accent] : "text-gray-600"}`}>
              <span className="shrink-0">{line.icon}</span>
              <span>{line.text}</span>
            </div>
          ))}
          <div ref={logEndRef} />
        </div>
      )}

      {/* Status footer */}
      {(done || error) && !running && (
        <div className={`px-5 py-2 text-xs border-t ${error ? "bg-red-50 text-red-500 border-red-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"}`}>
          {error
            ? `✗ Failed — ${error}`
            : `✓ Complete · Button locked until 10:00 AM tomorrow`}
        </div>
      )}

      {/* Idle hint */}
      {!running && !done && !error && log.length === 0 && !isLocked && (
        <div className="px-5 py-3 text-xs text-gray-400">
          Click <strong>Run Now</strong> to fetch and curate today&apos;s top AI papers from HuggingFace.
          Results stream in real-time as each paper is scored.
        </div>
      )}
    </div>
  );
}
