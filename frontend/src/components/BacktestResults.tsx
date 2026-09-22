"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  ColorType,
  LineSeries,
  type IChartApi,
  type LineData,
  type Time,
} from "lightweight-charts";
import type { BacktestResult } from "@/lib/api";

interface BacktestResultsProps {
  backtest: BacktestResult;
}

/**
 * BacktestResults — displays the ML strategy vs Buy-and-Hold comparison
 * with cumulative returns line chart and key portfolio metrics.
 */
export default function BacktestResults({ backtest }: BacktestResultsProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!chartRef.current || backtest.daily_cumulative.length === 0) return;

    if (chartInstance.current) {
      chartInstance.current.remove();
      chartInstance.current = null;
    }

    const chart = createChart(chartRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "rgba(255, 255, 255, 0.5)",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "rgba(255, 255, 255, 0.03)" },
        horzLines: { color: "rgba(255, 255, 255, 0.03)" },
      },
      rightPriceScale: { borderColor: "rgba(255, 255, 255, 0.1)" },
      timeScale: {
        borderColor: "rgba(255, 255, 255, 0.1)",
        timeVisible: false,
      },
      width: chartRef.current.clientWidth,
      height: 220,
    });

    chartInstance.current = chart;

    // ML Strategy line.
    const mlSeries = chart.addSeries(LineSeries, {
      color: "#06b6d4",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
    });

    const mlData: LineData<Time>[] = backtest.daily_cumulative.map((d) => ({
      time: d.date as Time,
      value: d.ml_cumulative,
    }));
    mlSeries.setData(mlData);

    // Buy & Hold line.
    const bhSeries = chart.addSeries(LineSeries, {
      color: "rgba(251, 191, 36, 0.7)",
      lineWidth: 2,
      lineStyle: 0,
      priceLineVisible: false,
      lastValueVisible: true,
    });

    const bhData: LineData<Time>[] = backtest.daily_cumulative.map((d) => ({
      time: d.date as Time,
      value: d.bh_cumulative,
    }));
    bhSeries.setData(bhData);

    chart.timeScale().fitContent();

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        chart.applyOptions({ width: entry.contentRect.width });
      }
    });
    resizeObserver.observe(chartRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartInstance.current = null;
    };
  }, [backtest]);

  const formatCurrency = (val: number) =>
    `₹${val.toLocaleString("en-IN", { minimumFractionDigits: 0 })}`;

  const mlWins = backtest.ml_return_pct > backtest.bh_return_pct;

  return (
    <div className="glass-card overflow-hidden">
      <div className="border-b border-white/5 px-5 py-3">
        <h2 className="text-sm font-semibold text-white">Backtest Results</h2>
        <p className="text-[11px] text-white/40">
          ML Strategy vs Buy & Hold · Starting Capital: {formatCurrency(backtest.starting_capital)}
        </p>
      </div>

      {/* Comparison cards */}
      <div className="grid grid-cols-2 gap-px border-b border-white/5 bg-white/5">
        <div className="bg-[var(--surface)] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-cyan-400/70">
            ML Strategy
          </p>
          <p className="mt-1 text-xl font-bold text-white">
            {formatCurrency(backtest.ml_final_value)}
          </p>
          <p className={`text-xs font-medium ${backtest.ml_return_pct >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {backtest.ml_return_pct >= 0 ? "+" : ""}{backtest.ml_return_pct}%
          </p>
        </div>
        <div className="bg-[var(--surface)] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-400/70">
            Buy & Hold
          </p>
          <p className="mt-1 text-xl font-bold text-white">
            {formatCurrency(backtest.bh_final_value)}
          </p>
          <p className={`text-xs font-medium ${backtest.bh_return_pct >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {backtest.bh_return_pct >= 0 ? "+" : ""}{backtest.bh_return_pct}%
          </p>
        </div>
      </div>

      {/* Cumulative returns chart */}
      <div>
        <div className="flex items-center gap-4 px-5 pt-3 text-[10px]">
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded bg-cyan-400" /> ML Strategy
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded bg-amber-400/70" /> Buy & Hold
          </span>
        </div>
        <div ref={chartRef} className="w-full" />
      </div>

      {/* Sharpe Ratio footer */}
      <div className="border-t border-white/5 px-5 py-3 flex items-center justify-between">
        <span className="text-xs text-white/40">Annualised Sharpe Ratio</span>
        <span
          className={`text-sm font-bold ${
            backtest.sharpe_ratio > 0 ? "text-emerald-400" : "text-red-400"
          }`}
        >
          {backtest.sharpe_ratio.toFixed(4)}
        </span>
      </div>
    </div>
  );
}
