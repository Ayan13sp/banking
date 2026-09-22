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
import type { MarketDataPoint } from "@/lib/api";

interface IndicatorOverlayProps {
  data: MarketDataPoint[];
}

/**
 * IndicatorOverlay — RSI pane rendered below the candlestick chart.
 * Shows overbought (>70) and oversold (<30) threshold lines.
 * Uses Lightweight Charts v5 addSeries API.
 */
export default function IndicatorOverlay({ data }: IndicatorOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return;

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
      rightPriceScale: {
        borderColor: "rgba(255, 255, 255, 0.1)",
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: {
        borderColor: "rgba(255, 255, 255, 0.1)",
        timeVisible: false,
      },
      crosshair: {
        horzLine: { visible: true, labelVisible: true },
        vertLine: { visible: true, labelVisible: true },
      },
      width: containerRef.current.clientWidth,
      height: 180,
    });

    chartRef.current = chart;

    // ── RSI line (v5 API) ─────────────────────────────────────────────
    const rsiSeries = chart.addSeries(LineSeries, {
      color: "#a855f7",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
    });

    const rsiData: LineData<Time>[] = data
      .filter((d) => d.rsi_14 !== null)
      .map((d) => ({ time: d.date as Time, value: d.rsi_14! }));

    rsiSeries.setData(rsiData);

    // ── Overbought (70) threshold ─────────────────────────────────────
    const overbought = chart.addSeries(LineSeries, {
      color: "rgba(239, 68, 68, 0.4)",
      lineWidth: 1,
      lineStyle: 2,
      crosshairMarkerVisible: false,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    overbought.setData(
      rsiData.map((d) => ({ time: d.time, value: 70 }))
    );

    // ── Oversold (30) threshold ───────────────────────────────────────
    const oversold = chart.addSeries(LineSeries, {
      color: "rgba(34, 197, 94, 0.4)",
      lineWidth: 1,
      lineStyle: 2,
      crosshairMarkerVisible: false,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    oversold.setData(
      rsiData.map((d) => ({ time: d.time, value: 30 }))
    );

    chart.timeScale().fitContent();

    // Responsive resize.
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        chart.applyOptions({ width: entry.contentRect.width });
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
          <h2 className="text-sm font-semibold text-white">RSI-14</h2>
          <p className="text-[11px] text-white/40">
            Relative Strength Index · Momentum Oscillator
          </p>
        </div>
        <div className="hidden gap-3 text-[10px] sm:flex">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-red-400/60" /> Overbought (70)
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-green-400/60" /> Oversold (30)
          </span>
        </div>
      </div>
      <div ref={containerRef} className="w-full" />
    </div>
  );
}
