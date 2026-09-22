"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  ColorType,
  CrosshairMode,
  CandlestickSeries,
  LineSeries,
  type IChartApi,
  type CandlestickData,
  type LineData,
  type Time,
} from "lightweight-charts";
import type { MarketDataPoint } from "@/lib/api";

interface CandlestickChartProps {
  data: MarketDataPoint[];
  ticker: string;
}

/**
 * CandlestickChart — renders OHLC candlesticks with Bollinger Bands and SMA overlays
 * using TradingView's Lightweight Charts v5 library.
 */
export default function CandlestickChart({ data, ticker }: CandlestickChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return;

    // Dispose previous chart instance if it exists.
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "rgba(255, 255, 255, 0.5)",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "rgba(255, 255, 255, 0.03)" },
        horzLines: { color: "rgba(255, 255, 255, 0.03)" },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: {
        borderColor: "rgba(255, 255, 255, 0.1)",
      },
      timeScale: {
        borderColor: "rgba(255, 255, 255, 0.1)",
        timeVisible: false,
      },
      width: containerRef.current.clientWidth,
      height: 400,
    });

    chartRef.current = chart;

    // ── Candlestick series (v5 API: addSeries) ────────────────────────
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderDownColor: "#ef4444",
      borderUpColor: "#22c55e",
      wickDownColor: "#ef4444",
      wickUpColor: "#22c55e",
    });

    const candleData: CandlestickData<Time>[] = data.map((d) => ({
      time: d.date as Time,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));
    candleSeries.setData(candleData);

    // ── Bollinger Bands (shaded area) ─────────────────────────────────
    const bbUpper = chart.addSeries(LineSeries, {
      color: "rgba(59, 130, 246, 0.4)",
      lineWidth: 1,
      lineStyle: 2, // Dashed
      crosshairMarkerVisible: false,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const bbLower = chart.addSeries(LineSeries, {
      color: "rgba(59, 130, 246, 0.4)",
      lineWidth: 1,
      lineStyle: 2,
      crosshairMarkerVisible: false,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const bbUpperData: LineData<Time>[] = data
      .filter((d) => d.bb_upper !== null)
      .map((d) => ({ time: d.date as Time, value: d.bb_upper! }));

    const bbLowerData: LineData<Time>[] = data
      .filter((d) => d.bb_lower !== null)
      .map((d) => ({ time: d.date as Time, value: d.bb_lower! }));

    bbUpper.setData(bbUpperData);
    bbLower.setData(bbLowerData);

    // ── SMA 50 overlay ────────────────────────────────────────────────
    const sma50Series = chart.addSeries(LineSeries, {
      color: "rgba(251, 191, 36, 0.6)",
      lineWidth: 1,
      crosshairMarkerVisible: false,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const sma50Data: LineData<Time>[] = data
      .filter((d) => d.sma_50 !== null)
      .map((d) => ({ time: d.date as Time, value: d.sma_50! }));

    sma50Series.setData(sma50Data);

    // ── EMA 14 overlay ────────────────────────────────────────────────
    const ema14Series = chart.addSeries(LineSeries, {
      color: "rgba(168, 85, 247, 0.6)",
      lineWidth: 1,
      crosshairMarkerVisible: false,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const ema14Data: LineData<Time>[] = data
      .filter((d) => d.ema_14 !== null)
      .map((d) => ({ time: d.date as Time, value: d.ema_14! }));

    ema14Series.setData(ema14Data);

    // Fit chart to content.
    chart.timeScale().fitContent();

    // ── Responsive resize ─────────────────────────────────────────────
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        chart.applyOptions({ width });
      }
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [data]);

  return (
    <div className="glass-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/5 px-5 py-3">
        <div>
          <h2 className="text-sm font-semibold text-white">{ticker} — Price Chart</h2>
          <p className="text-[11px] text-white/40">
            Candlesticks · Bollinger Bands · SMA 50 · EMA 14
          </p>
        </div>
        {/* Legend */}
        <div className="hidden gap-3 text-[10px] sm:flex">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-blue-400/60" /> BB
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-400/60" /> SMA 50
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-purple-400/60" /> EMA 14
          </span>
        </div>
      </div>
      <div ref={containerRef} className="w-full" />
    </div>
  );
}
