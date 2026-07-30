"use client";

import { useState } from "react";
import type { Report } from "@/lib/report";
import ReportView from "@/components/sections/ReportView";

const EXAMPLE_TICKERS = ["AAPL", "MSFT", "GOOGL", "NVDA"];

// Mirrors the numbered sections rendered by ReportView.
const REPORT_SECTIONS = [
  "Company summary",
  "Financial statements",
  "Risk & return ratios",
  "Valuation ratios",
  "Statement graphs",
  "Common size graphs",
  "Dividends & analyst consensus",
  "EPS: estimate vs actual",
  "Forward estimates",
  "Ownership breakdown",
  "Insider transactions",
];

function BrandMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect width="32" height="32" rx="7" fill="#003b73" />
      <rect x="6" y="18" width="4" height="8" rx="1" fill="#ffffff" fillOpacity="0.55" />
      <rect x="14" y="13" width="4" height="13" rx="1" fill="#ffffff" fillOpacity="0.75" />
      <rect x="22" y="8" width="4" height="18" rx="1" fill="#ffffff" />
      <path
        d="M6 16L14 12L18 14L26 6"
        stroke="#7fd4d8"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="26" cy="6" r="2.2" fill="#7fd4d8" />
    </svg>
  );
}

export default function Home() {
  const [ticker, setTicker] = useState("AAPL");
  // Yahoo's annual statements only go back ~4 years, so that's the practical max.
  const [years, setYears] = useState(4);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function analyze(raw: string) {
    const sym = raw.trim().toUpperCase();
    if (!sym || loading) return;
    setLoading(true);
    setError(null);
    setReport(null);
    try {
      const res = await fetch(`/api/report?ticker=${encodeURIComponent(sym)}&years=${years}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
      setReport(data as Report);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function quickPick(sym: string) {
    setTicker(sym);
    void analyze(sym);
  }

  function downloadPdf() {
    if (!report) return;
    const { ticker: tk, years: yr } = report.meta;
    window.open(`/api/report/pdf?ticker=${encodeURIComponent(tk)}&years=${yr}`, "_blank");
  }

  const showHero = !report && !loading && !error;

  function renderSearchForm(variant: "hero" | "topbar") {
    return (
      <form
        className={variant === "hero" ? "controls controls-lg" : "controls"}
        onSubmit={(e) => {
          e.preventDefault();
          void analyze(ticker);
        }}
      >
        <input
          value={ticker}
          onChange={(e) => setTicker(e.target.value)}
          placeholder="Ticker (e.g. AAPL)"
          aria-label="Ticker"
          autoCapitalize="characters"
        />
        <select value={years} onChange={(e) => setYears(Number(e.target.value))} aria-label="Years">
          {[3, 4].map((y) => (
            <option key={y} value={y}>
              {y} years
            </option>
          ))}
        </select>
        <button type="submit" disabled={loading}>
          {loading ? "Loading…" : "Analyze"}
        </button>
        {report && (
          <button type="button" className="secondary" onClick={downloadPdf}>
            Download PDF
          </button>
        )}
      </form>
    );
  }

  return (
    <main className="page">
      <header className="topbar">
        <div className="brand">
          <BrandMark />
          <h1>Fundamental Analysis</h1>
        </div>
        {!showHero && renderSearchForm("topbar")}
      </header>

      {showHero && (
        <section className="hero">
          <h2 className="hero-title">Fundamental analysis reports</h2>
          <p className="hero-sub">
            Enter any ticker to generate a full fundamental report, exportable to PDF.
          </p>
          <div className="hero-search">{renderSearchForm("hero")}</div>
          <div className="chips" role="group" aria-label="Example tickers">
            <span className="chips-label">Examples</span>
            {EXAMPLE_TICKERS.map((s) => (
              <button key={s} type="button" className="chip" onClick={() => quickPick(s)}>
                {s}
              </button>
            ))}
          </div>
          <div className="contents">
            <h3 className="contents-title">What the report contains</h3>
            <ol className="contents-list">
              {REPORT_SECTIONS.map((name, i) => (
                <li key={name}>
                  <span className="contents-num">{i + 1}</span>
                  {name}
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {error && (
        <div className="error" role="alert">
          <div>
            <strong>Couldn&rsquo;t generate the report.</strong> {error}
          </div>
        </div>
      )}

      {loading && (
        <div className="loading" role="status">
          <span className="spinner" aria-hidden="true" />
          <p>Fetching data from Yahoo Finance…</p>
          <div className="skeleton-stack" aria-hidden="true">
            <div className="skeleton-card" />
            <div className="skeleton-card" />
            <div className="skeleton-card" />
          </div>
        </div>
      )}

      {report && (
        <>
          <div className="report-head">
            <h2>{report.meta.companyName}</h2>
            <span className="ticker-pill">{report.meta.companySymbol}</span>
            <span className="muted">
              {report.meta.years} years · generated {report.meta.generatedAt}
            </span>
          </div>
          <ReportView report={report} />
        </>
      )}

      <footer className="footer">Data provided by Yahoo Finance.</footer>
    </main>
  );
}
