"use client";

import type { FeatureImportance as FI } from "@/lib/api";

interface FeatureImportanceProps {
  importances: FI[];
}

/**
 * FeatureImportance — horizontal bar chart showing the Random Forest
 * feature importances with animated gradient-filled bars.
 */
export default function FeatureImportance({ importances }: FeatureImportanceProps) {
  // Find the max importance for scaling bars to 100%.
  const maxImportance = Math.max(...importances.map((f) => f.importance));

  /** Map feature names to human-readable labels. */
  const featureLabels: Record<string, string> = {
    sma_14: "SMA 14",
    sma_50: "SMA 50",
    ema_14: "EMA 14",
    ema_50: "EMA 50",
    rsi_14: "RSI 14",
    bb_upper: "BB Upper",
    bb_lower: "BB Lower",
  };

  /** Gradient colors for each bar (cycled). */
  const gradients = [
    "from-cyan-500 to-blue-500",
    "from-purple-500 to-indigo-500",
    "from-emerald-500 to-teal-500",
    "from-amber-500 to-orange-500",
    "from-pink-500 to-rose-500",
    "from-sky-500 to-cyan-500",
    "from-violet-500 to-purple-500",
  ];

  return (
    <div className="glass-card p-5">
      <h2 className="mb-1 text-sm font-semibold text-white">Feature Importances</h2>
      <p className="mb-4 text-[11px] text-white/40">
        Random Forest · Gini-based importance scores
      </p>

      <div className="space-y-3">
        {importances.map((feat, i) => {
          const pct = (feat.importance / maxImportance) * 100;
          const label = featureLabels[feat.feature] || feat.feature;
          const gradient = gradients[i % gradients.length];

          return (
            <div key={feat.feature}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-medium text-white/70">{label}</span>
                <span className="font-mono text-white/40">
                  {(feat.importance * 100).toFixed(1)}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/5">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${gradient} transition-all duration-1000 ease-out`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
