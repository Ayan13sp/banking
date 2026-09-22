"use client";

import { useState } from "react";

interface TickerSearchProps {
  onAnalyze: (ticker: string, years: number) => void;
  isLoading: boolean;
}

/** Pre-populated popular Indian tickers for quick selection. */
const POPULAR_TICKERS = [
  { symbol: "RELIANCE.NS", name: "Reliance" },
  { symbol: "HDFCBANK.NS", name: "HDFC Bank" },
  { symbol: "TCS.NS", name: "TCS" },
  { symbol: "INFY.NS", name: "Infosys" },
  { symbol: "ICICIBANK.NS", name: "ICICI Bank" },
  { symbol: "SBIN.NS", name: "SBI" },
];

/**
 * TickerSearch — input field with quick-select chips and an Analyze button.
 */
export default function TickerSearch({ onAnalyze, isLoading }: TickerSearchProps) {
  const [ticker, setTicker] = useState("RELIANCE.NS");
  const [years, setYears] = useState(5);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (ticker.trim()) {
      onAnalyze(ticker.trim().toUpperCase(), years);
    }
  };

  return (
    <div className="glass-card p-5">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/50">
        Stock Analysis
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Ticker input */}
        <div className="relative">
          <input
            id="ticker-input"
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            placeholder="Enter ticker (e.g. RELIANCE.NS)"
            disabled={isLoading}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white
                       placeholder-white/30 outline-none transition-all
                       focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20
                       disabled:opacity-50"
          />
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/20">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Quick-select chips */}
        <div className="flex flex-wrap gap-2">
          {POPULAR_TICKERS.map((t) => (
            <button
              key={t.symbol}
              type="button"
              onClick={() => setTicker(t.symbol)}
              disabled={isLoading}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all
                ${ticker === t.symbol
                  ? "border-cyan-500/50 bg-cyan-500/15 text-cyan-400"
                  : "border-white/10 bg-white/5 text-white/50 hover:border-white/20 hover:text-white/70"
                }
                disabled:opacity-40`}
            >
              {t.name}
            </button>
          ))}
        </div>

        {/* Years selector + Analyze button */}
        <div className="flex gap-3">
          <select
            id="years-select"
            value={years}
            onChange={(e) => setYears(Number(e.target.value))}
            disabled={isLoading}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white
                       outline-none transition-all focus:border-cyan-500/50
                       disabled:opacity-50"
          >
            {[1, 2, 3, 5, 7, 10].map((y) => (
              <option key={y} value={y} className="bg-[#0f1729] text-white">
                {y}Y
              </option>
            ))}
          </select>

          <button
            id="analyze-button"
            type="submit"
            disabled={isLoading || !ticker.trim()}
            className="flex-1 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3
                       text-sm font-semibold text-white shadow-lg shadow-cyan-500/25
                       transition-all hover:shadow-cyan-500/40 hover:brightness-110
                       active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Analyzing…
              </span>
            ) : (
              "Analyze"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
