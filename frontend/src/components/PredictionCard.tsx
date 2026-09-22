"use client";

import type { PredictionDetail } from "@/lib/api";

interface PredictionCardProps {
  prediction: PredictionDetail;
  ticker: string;
}

/**
 * PredictionCard — glassmorphism card displaying the model's latest
 * Buy/Sell signal with a confidence gauge. Green glow for Buy, red for Sell.
 */
export default function PredictionCard({ prediction, ticker }: PredictionCardProps) {
  const isBuy = prediction.signal === 1;
  const confidence = Math.round(prediction.confidence * 100);

  return (
    <div
      className={`glass-card relative overflow-hidden p-5 ${
        isBuy ? "ring-1 ring-emerald-500/20" : "ring-1 ring-red-500/20"
      }`}
    >
      {/* Glow effect */}
      <div
        className={`absolute -top-12 -right-12 h-32 w-32 rounded-full blur-3xl ${
          isBuy ? "bg-emerald-500/15" : "bg-red-500/15"
        }`}
      />

      <div className="relative">
        <h2 className="mb-1 text-xs font-semibold uppercase tracking-wider text-white/40">
          ML Prediction
        </h2>
        <p className="mb-4 text-[11px] text-white/30">
          {ticker} · {prediction.date}
        </p>

        {/* Signal badge */}
        <div className="mb-5 flex items-center gap-3">
          <div
            className={`flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-bold shadow-lg ${
              isBuy
                ? "bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-emerald-500/30"
                : "bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-red-500/30"
            }`}
          >
            {isBuy ? "↑" : "↓"}
          </div>
          <div>
            <p className={`text-2xl font-bold ${isBuy ? "text-emerald-400" : "text-red-400"}`}>
              {isBuy ? "BUY" : "SELL / HOLD"}
            </p>
            <p className="text-xs text-white/40">
              {isBuy ? "Model predicts upward movement" : "Model predicts flat or decline"}
            </p>
          </div>
        </div>

        {/* Confidence gauge */}
        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-white/50">Confidence</span>
            <span className={`font-semibold ${isBuy ? "text-emerald-400" : "text-red-400"}`}>
              {confidence}%
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/5">
            <div
              className={`h-full rounded-full transition-all duration-1000 ease-out ${
                isBuy
                  ? "bg-gradient-to-r from-emerald-500 to-green-400"
                  : "bg-gradient-to-r from-red-500 to-rose-400"
              }`}
              style={{ width: `${confidence}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
