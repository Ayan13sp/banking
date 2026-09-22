"use client";

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  /** "positive" = green accent, "negative" = red, "neutral" = default */
  sentiment?: "positive" | "negative" | "neutral";
  icon?: React.ReactNode;
}

/**
 * StatCard — reusable metric card with glassmorphism styling.
 * Used for Accuracy, Precision, Recall, Sharpe Ratio, etc.
 */
export default function StatCard({
  label,
  value,
  subtitle,
  sentiment = "neutral",
  icon,
}: StatCardProps) {
  const accentColor =
    sentiment === "positive"
      ? "text-emerald-400"
      : sentiment === "negative"
      ? "text-red-400"
      : "text-cyan-400";

  return (
    <div className="glass-card p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
            {label}
          </p>
          <p className={`mt-1 text-2xl font-bold ${accentColor}`}>{value}</p>
          {subtitle && (
            <p className="mt-0.5 text-[11px] text-white/30">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-white/30">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
