"use client";

import { useState } from "react";

interface NavbarProps {
  backendStatus: "connected" | "disconnected" | "checking";
}

/**
 * Navbar — top navigation bar with branding and backend connection indicator.
 */
export default function Navbar({ backendStatus }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const statusColor =
    backendStatus === "connected"
      ? "bg-emerald-400"
      : backendStatus === "checking"
      ? "bg-amber-400"
      : "bg-red-400";

  const statusText =
    backendStatus === "connected"
      ? "API Connected"
      : backendStatus === "checking"
      ? "Connecting…"
      : "API Offline";

  return (
    <nav className="sticky top-0 z-50 border-b border-white/5 bg-[var(--surface)]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo & title */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 text-sm font-bold text-white shadow-lg shadow-cyan-500/20">
            AM
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight text-white">
              Algorithmic Market Analyzer
            </h1>
            <p className="text-[11px] text-white/40">
              ML-Powered Trade Classification
            </p>
          </div>
        </div>

        {/* Desktop status */}
        <div className="hidden items-center gap-4 sm:flex">
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60">
            <span
              className={`h-2 w-2 rounded-full ${statusColor} ${
                backendStatus === "checking" ? "animate-pulse" : ""
              }`}
            />
            {statusText}
          </div>
        </div>

        {/* Mobile toggle */}
        <button
          className="sm:hidden text-white/60 hover:text-white"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d={mobileOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
          </svg>
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="border-t border-white/5 bg-[var(--surface)] px-4 py-3 sm:hidden">
          <div className="flex items-center gap-2 text-xs text-white/60">
            <span className={`h-2 w-2 rounded-full ${statusColor}`} />
            {statusText}
          </div>
        </div>
      )}
    </nav>
  );
}
