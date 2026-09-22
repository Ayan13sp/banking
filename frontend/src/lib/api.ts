/**
 * API Client
 * ==========
 * Typed fetch wrapper for communicating with the FastAPI backend.
 * Base URL is configurable via NEXT_PUBLIC_API_URL environment variable.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/* ═══════════════════════════════════════════════════════════════════════════
   TYPE DEFINITIONS (mirrors backend Pydantic schemas)
   ═══════════════════════════════════════════════════════════════════════ */

export interface MarketDataPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  sma_14: number | null;
  sma_50: number | null;
  ema_14: number | null;
  ema_50: number | null;
  rsi_14: number | null;
  bb_upper: number | null;
  bb_lower: number | null;
  target: number | null;
}

export interface PredictionDetail {
  date: string;
  signal: number;
  confidence: number;
}

export interface FeatureImportance {
  feature: string;
  importance: number;
}

export interface ClassificationMetrics {
  accuracy: number;
  precision: number;
  recall: number;
}

export interface DailyCumulative {
  date: string;
  ml_cumulative: number;
  bh_cumulative: number;
}

export interface BacktestResult {
  starting_capital: number;
  ml_final_value: number;
  bh_final_value: number;
  ml_return_pct: number;
  bh_return_pct: number;
  sharpe_ratio: number;
  daily_cumulative: DailyCumulative[];
}

export interface AnalysisResponse {
  ticker: string;
  data_points: number;
  train_size: number;
  test_size: number;
  date_range: { start: string; end: string };
  market_data: MarketDataPoint[];
  predictions: PredictionDetail[];
  latest_prediction: PredictionDetail | null;
  metrics: ClassificationMetrics;
  feature_importances: FeatureImportance[];
  backtest: BacktestResult;
}

/* ═══════════════════════════════════════════════════════════════════════════
   API FUNCTIONS
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * Run the full analysis pipeline for a ticker.
 */
export async function analyzeTicker(
  ticker: string,
  years: number = 5
): Promise<AnalysisResponse> {
  const res = await fetch(`${API_BASE}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ticker, years }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Analysis failed");
  }

  return res.json();
}

/**
 * Health check.
 */
export async function checkHealth(): Promise<{ status: string }> {
  const res = await fetch(`${API_BASE}/api/health`);
  return res.json();
}
