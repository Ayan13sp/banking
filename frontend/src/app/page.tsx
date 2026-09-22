"use client";

import { useCallback, useEffect, useState } from "react";
import { analyzeTicker, checkHealth, type AnalysisResponse } from "@/lib/api";

import Navbar from "@/components/Navbar";
import TickerSearch from "@/components/TickerSearch";
import CandlestickChart from "@/components/CandlestickChart";
import IndicatorOverlay from "@/components/IndicatorOverlay";
import PredictionCard from "@/components/PredictionCard";
import BacktestResults from "@/components/BacktestResults";
import FeatureImportance from "@/components/FeatureImportance";
import StatCard from "@/components/StatCard";

type BackendStatus = "connected" | "disconnected" | "checking";

/**
 * Dashboard Page — the main entry point.
 *
 * Layout (desktop):
 *   ┌──────────────────────────┬──────────────────┐
 *   │  Ticker Search           │  Prediction Card │
 *   ├──────────────────────────┤  + Stat Cards    │
 *   │  Candlestick Chart       │                  │
 *   │  RSI Indicator           │                  │
 *   ├──────────────────────────┴──────────────────┤
 *   │  Backtest Results  │  Feature Importances   │
 *   └────────────────────────────────────────────-─┘
 */
export default function DashboardPage() {
  const [backendStatus, setBackendStatus] = useState<BackendStatus>("checking");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AnalysisResponse | null>(null);

  // ── Health check on mount ──────────────────────────────────────────
  useEffect(() => {
    checkHealth()
      .then(() => setBackendStatus("connected"))
      .catch(() => setBackendStatus("disconnected"));
  }, []);

  // ── Analyze handler ────────────────────────────────────────────────
  const handleAnalyze = useCallback(async (ticker: string, years: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await analyzeTicker(ticker, years);
      setData(result);
      setBackendStatus("connected");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Analysis failed";
      setError(message);
      console.error("Analysis error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <>
      <Navbar backendStatus={backendStatus} />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
        {/* Error banner */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* ── Top section: Search + Prediction ────────────────────────── */}
        <div className="grid gap-5 lg:grid-cols-3">
          {/* Left column — Search + Charts (2/3 width) */}
          <div className="space-y-5 lg:col-span-2">
            <TickerSearch onAnalyze={handleAnalyze} isLoading={isLoading} />

            {/* Loading skeleton */}
            {isLoading && (
              <div className="space-y-5">
                <div className="skeleton h-[460px]" />
                <div className="skeleton h-[220px]" />
              </div>
            )}

            {/* Charts — only render when data is available */}
            {!isLoading && data && (
              <>
                <CandlestickChart data={data.market_data} ticker={data.ticker} />
                <IndicatorOverlay data={data.market_data} />
              </>
            )}
          </div>

          {/* Right column — Prediction + Stats (1/3 width) */}
          <div className="space-y-5">
            {isLoading && (
              <>
                <div className="skeleton h-[200px]" />
                <div className="grid grid-cols-2 gap-3">
                  <div className="skeleton h-[90px]" />
                  <div className="skeleton h-[90px]" />
                  <div className="skeleton h-[90px]" />
                  <div className="skeleton h-[90px]" />
                </div>
              </>
            )}

            {!isLoading && data && data.latest_prediction && (
              <>
                <PredictionCard
                  prediction={data.latest_prediction}
                  ticker={data.ticker}
                />

                {/* Metric cards grid */}
                <div className="grid grid-cols-2 gap-3">
                  <StatCard
                    label="Accuracy"
                    value={`${(data.metrics.accuracy * 100).toFixed(1)}%`}
                    subtitle="Test set"
                    sentiment={data.metrics.accuracy > 0.5 ? "positive" : "neutral"}
                    icon={
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    }
                  />
                  <StatCard
                    label="Precision"
                    value={`${(data.metrics.precision * 100).toFixed(1)}%`}
                    subtitle="Buy signal"
                    sentiment={data.metrics.precision > 0.5 ? "positive" : "neutral"}
                    icon={
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    }
                  />
                  <StatCard
                    label="Recall"
                    value={`${(data.metrics.recall * 100).toFixed(1)}%`}
                    subtitle="Coverage"
                    sentiment={data.metrics.recall > 0.5 ? "positive" : "neutral"}
                    icon={
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    }
                  />
                  <StatCard
                    label="Data Points"
                    value={data.data_points.toLocaleString()}
                    subtitle={`${data.date_range.start} → ${data.date_range.end}`}
                    icon={
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                      </svg>
                    }
                  />
                </div>

                {/* Train / Test split info */}
                <div className="glass-card p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40 mb-2">
                    Time-Series Split
                  </p>
                  <div className="flex gap-1 h-3 rounded-full overflow-hidden bg-white/5">
                    <div
                      className="bg-gradient-to-r from-cyan-500 to-blue-500 rounded-l-full transition-all duration-700"
                      style={{ width: `${(data.train_size / data.data_points) * 100}%` }}
                    />
                    <div
                      className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-r-full transition-all duration-700"
                      style={{ width: `${(data.test_size / data.data_points) * 100}%` }}
                    />
                  </div>
                  <div className="mt-2 flex justify-between text-[10px] text-white/40">
                    <span>Train: {data.train_size} rows (80%)</span>
                    <span>Test: {data.test_size} rows (20%)</span>
                  </div>
                </div>
              </>
            )}

            {/* Empty state */}
            {!isLoading && !data && (
              <div className="glass-card flex flex-col items-center justify-center p-10 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 text-cyan-400/60">
                  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-white/60">
                  Enter a ticker to begin
                </p>
                <p className="mt-1 text-xs text-white/30">
                  The ML pipeline will fetch data, train a model, and backtest the strategy.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Bottom section: Backtest + Feature Importance ──────────── */}
        {!isLoading && data && (
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <BacktestResults backtest={data.backtest} />
            <FeatureImportance importances={data.feature_importances} />
          </div>
        )}

        {/* Footer */}
        <footer className="mt-12 border-t border-white/5 py-6 text-center text-xs text-white/20">
          Algorithmic Market Analyzer · Built with FastAPI, scikit-learn, Next.js & Lightweight Charts
        </footer>
      </main>
    </>
  );
}
