"use client";

import { useState } from "react";
import type { Report } from "@/lib/report";
import ReportView from "@/components/sections/ReportView";

export default function Home() {
  const [ticker, setTicker] = useState("AAPL");
  // Yahoo's annual statements only go back ~4 years, so that's the practical max.
  const [years, setYears] = useState(4);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    const sym = ticker.trim().toUpperCase();
    if (!sym) return;
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

  function downloadPdf() {
    if (!report) return;
    const { ticker: tk, years: yr } = report.meta;
    window.open(`/api/report/pdf?ticker=${encodeURIComponent(tk)}&years=${yr}`, "_blank");
  }

  return (
    <main className="page">
      <header className="topbar">
        <div className="brand">
          <h1>Fundamental Analysis</h1>
        </div>
        <form className="controls" onSubmit={run}>
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
      </header>

      {error && <div className="error">{error}</div>}

      {loading && <div className="status">Fetching data from Yahoo Finance…</div>}

      {report && (
        <>
          <div className="report-head">
            <h2>{report.meta.companyName}</h2>
            <span className="muted">
              {report.meta.companySymbol} · {report.meta.years} years · generated{" "}
              {report.meta.generatedAt}
            </span>
          </div>
          <ReportView report={report} />
          <footer className="footer">Data provided by Yahoo Finance.</footer>
        </>
      )}

      {!report && !loading && !error && (
        <div className="status">Enter a ticker and click Analyze to generate a report.</div>
      )}
    </main>
  );
}
