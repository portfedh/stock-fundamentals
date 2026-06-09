# Fundamental Analysis — Web App

A dynamic, multi-user web version of the `fundamental_analysis_yfinance` Python CLI.
Enter a ticker, get an interactive report of the company's fundamentals (the same 11
sections the original produced as a PDF), and download a matching PDF.

Built entirely in **Next.js / TypeScript** — no Python. Data comes from Yahoo Finance
via [`yahoo-finance2`](https://github.com/gadicc/node-yahoo-finance2).

## What it produces

The same 11 sections as the original PDF:

1. Company summary (profile + business description)
2. Financial statements — income, balance sheet, cash flow (nominal + common-size)
3. Risk & returns ratios — debt, profit, efficiency
4. Valuation — market ratios + key metrics (incl. Graham Number / Net-Net)
5. Statement graphs (income, balance sheet, cash flow)
6. Common-size graphs + equity uses
7. Dividends + analyst consensus + price targets
8. EPS estimate vs actual + earnings surprises
9. Forward earnings & revenue estimates
10. Ownership breakdown (major + institutional holders)
11. Insider purchases & transactions

## Architecture

- `lib/yahoo.ts` — fetch + reshape Yahoo data into FMP-style fields (mirrors `fetch.py`).
- `lib/ratios.ts` — ~30 ratios + key metrics, ported line-for-line from `ratios.py`.
- `lib/tables.ts` — formatted tables; `lib/charts.ts` — ECharts option builders.
- `lib/report.ts` — `buildReport()`, the single source of truth (cached, TTL 10 min)
  used by **both** the page and the PDF, so they always agree.
- `app/api/report` — JSON report; `app/api/report/pdf` — PDF.
- `app/page.tsx` + `components/` — interactive page (ECharts via `echarts-for-react`).
- `pdf/` — PDF built with `@react-pdf/renderer`; charts are the same ECharts options
  rendered headless (SSR → SVG) and rasterized with `sharp` — no headless browser.

Each request is stateless, so it is safe for concurrent/multi-user hosting (e.g. Vercel).

## Run

```bash
npm install
npm run dev      # http://localhost:3000
# production:
npm run build && npm run start
```

## API

```
GET /api/report?ticker=AAPL&years=5         -> JSON report
GET /api/report/pdf?ticker=AAPL&years=5     -> application/pdf
```

`years` is clamped to 1–10 and capped at whatever Yahoo actually returns.

## Notes

- Yahoo Finance is an unofficial, rate-limited source; the TTL cache softens
  repeated/concurrent load. Heavy traffic may need a queue or a paid data feed.
- Missing data (e.g. no insider records, non-US tickers) renders as blank/"—",
  matching the original's graceful-skip behavior.
