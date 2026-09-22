import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Algorithmic Market Analyzer | ML-Powered Trade Classifier",
  description:
    "A quantitative analysis dashboard that uses Random Forest classification " +
    "on engineered statistical indicators (SMA, EMA, RSI, Bollinger Bands) " +
    "to generate buy/sell signals for Indian equities.",
  keywords: [
    "algorithmic trading",
    "machine learning",
    "stock analysis",
    "random forest",
    "financial engineering",
    "quantitative analysis",
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[var(--background)]">
        {children}
      </body>
    </html>
  );
}
