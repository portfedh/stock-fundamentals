// Port of tables.py: builds formatted Grids for every table in the report.
// Statement tables read oldest-first (left→right); ratio/metric tables read
// newest-first, matching the original PDF's column ordering.

import { Grid, emptyGrid } from "./grid";
import {
  BalanceRow,
  CashFlowRow,
  EarningsHistoryRow,
  EstimateRow,
  IncomeRow,
  InsiderPurchases,
  InsiderTransaction,
  InstitutionalHolder,
  MajorHolders,
  MetricRow,
  Num,
  PriceTargets,
  RatioRow,
} from "./types";
import { billions, DASH, nf, nfSigned, pctRaw, pctSigned } from "./format";
import { safeDiv } from "./math";

// metrics-as-rows, years-as-columns
function transposed<T extends { calendarYear: string }>(
  rows: T[],
  defs: { label: string; cell: (r: T) => string }[],
): Grid {
  const columns = ["", ...rows.map((r) => r.calendarYear)];
  const gridRows = defs.map((d) => [d.label, ...rows.map((r) => d.cell(r))]);
  return { columns, rows: gridRows };
}

// ── Financial statements (oldest-first) ─────────────────────────────────────

export function incomeStatementTable(is: IncomeRow[]): Grid {
  const m = (v: Num) => nf(v == null ? null : v / 1e6, 0);
  return transposed(is, [
    { label: "Revenue", cell: (r) => m(r.revenue) },
    { label: "Cost Of Revenue", cell: (r) => m(r.costOfRevenue) },
    { label: "Gross Profit", cell: (r) => m(r.grossProfit) },
    { label: "Operating Expenses", cell: (r) => m(r.operatingExpenses) },
    { label: "Operating Income", cell: (r) => m(r.operatingIncome) },
    { label: "Net Income", cell: (r) => m(r.netIncome) },
  ]);
}

export function incomeStatementCSTable(is: IncomeRow[]): Grid {
  // Common size: each line as a rounded % of revenue (mirrors tables.py).
  const c = (v: Num, r: IncomeRow) => {
    const ratio = safeDiv(v, r.revenue);
    return ratio == null ? DASH : `${Math.round(ratio * 100)}%`;
  };
  return transposed(is, [
    { label: "Revenue", cell: (r) => c(r.revenue, r) },
    { label: "Cost Of Revenue", cell: (r) => c(r.costOfRevenue, r) },
    { label: "Gross Profit", cell: (r) => c(r.grossProfit, r) },
    { label: "Operating Expenses", cell: (r) => c(r.operatingExpenses, r) },
    { label: "Operating Income", cell: (r) => c(r.operatingIncome, r) },
    { label: "Net Income", cell: (r) => c(r.netIncome, r) },
  ]);
}

export function balanceSheetTable(bs: BalanceRow[]): Grid {
  const m = (v: Num) => nf(v == null ? null : v / 1e6, 0);
  return transposed(bs, [
    { label: "Cur Assets", cell: (r) => m(r.totalCurrentAssets) },
    { label: "LT Asset", cell: (r) => m(r.totalNonCurrentAssets) },
    { label: "Total Assets", cell: (r) => m(r.totalAssets) },
    { label: "Cur Liabilities", cell: (r) => m(r.totalCurrentLiabilities) },
    { label: "LT Liabilities", cell: (r) => m(r.totalNonCurrentLiabilities) },
    { label: "Total Liab", cell: (r) => m(r.totalLiabilities) },
    { label: "SH Equity", cell: (r) => m(r.totalStockholdersEquity) },
  ]);
}

export function balanceSheetCSTable(bs: BalanceRow[]): Grid {
  const c = (v: Num, r: BalanceRow) => {
    const ratio = safeDiv(v, r.totalAssets);
    return ratio == null ? DASH : `${Math.round(ratio * 100)}%`;
  };
  return transposed(bs, [
    { label: "Cur Assets", cell: (r) => c(r.totalCurrentAssets, r) },
    { label: "LT Asset", cell: (r) => c(r.totalNonCurrentAssets, r) },
    { label: "Total Assets", cell: (r) => c(r.totalAssets, r) },
    { label: "Cur Liabilities", cell: (r) => c(r.totalCurrentLiabilities, r) },
    { label: "LT Liabilities", cell: (r) => c(r.totalNonCurrentLiabilities, r) },
    { label: "Total Liab", cell: (r) => c(r.totalLiabilities, r) },
    { label: "SH Equity", cell: (r) => c(r.totalStockholdersEquity, r) },
  ]);
}

export function cashFlowTable(cf: CashFlowRow[]): Grid {
  const m = (v: Num) => nf(v == null ? null : v / 1e6, 0);
  return transposed(cf, [
    { label: "CF Operating Activities", cell: (r) => m(r.netCashProvidedByOperatingActivities) },
    { label: "CF Investing Activities", cell: (r) => m(r.netCashUsedForInvestingActivites) },
    { label: "CF Financing Activities", cell: (r) => m(r.netCashUsedProvidedByFinancingActivities) },
    { label: "Change in cash", cell: (r) => m(r.netChangeInCash) },
    { label: "Cash end of period", cell: (r) => m(r.cashAtEndOfPeriod) },
    { label: "Cash beginning of period", cell: (r) => m(r.cashAtBeginningOfPeriod) },
  ]);
}

// ── Ratio / metric tables (newest-first) ────────────────────────────────────

export function marketRatiosTable(ratios: RatioRow[]): Grid {
  const r = [...ratios].reverse(); // newest-first
  return transposed(r, [
    { label: "Price to Book Ratio", cell: (x) => nf(x.priceToBookRatio, 0) },
    { label: "Price to Sales Ratio", cell: (x) => nf(x.priceToSalesRatio, 0) },
    { label: "Price to Earnings Ratio", cell: (x) => nf(x.priceEarningsRatio, 0) },
    { label: "Price to Operating Cashflow Ratio", cell: (x) => nf(x.priceToOperatingCashFlowsRatio, 0) },
    { label: "Enterprise Value Multiple", cell: (x) => nf(x.enterpriseValueMultiple, 0) },
    { label: "Price to Fair Value", cell: (x) => nf(x.priceFairValue, 0) },
    { label: "Dividend Yield", cell: (x) => pctRaw((x.dividendYield ?? 0) * 100, 1) },
    { label: "Earnings Yield", cell: (x) => pctRaw(mul100(safeDiv(1, x.priceEarningsRatio)), 1) },
  ]);
}

function mul100(v: Num): Num {
  return v == null ? null : v * 100;
}

export function debtRatiosTable(ratios: RatioRow[]): Grid {
  const r = [...ratios].reverse();
  return transposed(r, [
    { label: "Debt Assets Ratio", cell: (x) => nf(x.debtRatio, 1) },
    { label: "Debt Equity Ratio", cell: (x) => nf(x.debtEquityRatio, 1) },
    { label: "Current Ratio", cell: (x) => nf(x.currentRatio, 1) },
    { label: "Quick Ratio", cell: (x) => nf(x.quickRatio, 1) },
    { label: "Cash Ratio", cell: (x) => nf(x.cashRatio, 1) },
    { label: "Opp Cashflow to Debt", cell: (x) => nf(x.cashFlowToDebtRatio, 1) },
    { label: "Interest Coverage", cell: (x) => nf(x.interestCoverage, 1) },
  ]);
}

export function profitRatiosTable(ratios: RatioRow[]): Grid {
  const r = [...ratios].reverse();
  return transposed(r, [
    { label: "Gross Margin", cell: (x) => nf(x.grossProfitMargin, 2) },
    { label: "Operating Margin", cell: (x) => nf(x.operatingProfitMargin, 2) },
    { label: "Net Profit Margin", cell: (x) => nf(x.netProfitMargin, 2) },
    { label: "Effective Tax Rate", cell: (x) => nf(x.effectiveTaxRate, 2) },
    { label: "Return on Assets", cell: (x) => nf(x.returnOnAssets, 2) },
    { label: "Return on Equity", cell: (x) => nf(x.returnOnEquity, 2) },
    { label: "Return on Invested Capital", cell: (x) => nf(x.returnOnInvestedCapital, 2) },
    { label: "Return on Capital Employed", cell: (x) => nf(x.returnOnCapitalEmployed, 2) },
  ]);
}

export function efficiencyRatiosTable(ratios: RatioRow[]): Grid {
  const r = [...ratios].reverse();
  return transposed(r, [
    { label: "Days of Sales Outstanding", cell: (x) => nf(x.daysOfSalesOutstanding, 0) },
    { label: "Days of Payables Outstanding", cell: (x) => nf(x.daysOfPayablesOutstanding, 0) },
    { label: "Days of Inventory Outstanding", cell: (x) => nf(x.daysOfInventoryOutstanding, 0) },
    { label: "Days of Operating Cycle", cell: (x) => nf(x.operatingCycle, 0) },
    { label: "Cash Conversion Cycle", cell: (x) => nf(x.cashConversionCycle, 0) },
    { label: "Receivables Turnover", cell: (x) => nf(x.receivablesTurnover, 1) },
    { label: "Payables Turnover", cell: (x) => nf(x.payablesTurnover, 1) },
    { label: "Inventory Turnover", cell: (x) => nf(x.inventoryTurnover, 1) },
    { label: "Fixed Asset Turnover", cell: (x) => nf(x.fixedAssetTurnover, 1) },
    { label: "Asset Turnover", cell: (x) => nf(x.assetTurnover, 1) },
  ]);
}

export function keyMetricsTable(metrics: MetricRow[]): Grid {
  const r = [...metrics].reverse();
  const mm = (v: Num) => nf(v == null ? null : v / 1e6, 0);
  return transposed(r, [
    { label: "Market Cap (millions)", cell: (x) => mm(x.marketCap) },
    { label: "Net income per share", cell: (x) => nf(x.netIncomePerShare, 0) },
    { label: "Free Cash Flow per share", cell: (x) => nf(x.freeCashFlowPerShare, 0) },
    { label: "Book value per share", cell: (x) => nf(x.bookValuePerShare, 0) },
    { label: "Capex to Revenue", cell: (x) => capexPct(x.capexToRevenue) },
    { label: "Capex to Depreciation", cell: (x) => capexPct(x.capexToDepreciation) },
    { label: "Capex to Operating CashFlow", cell: (x) => capexPct(x.capexToOperatingCashFlow) },
    { label: "Graham Number", cell: (x) => nf(x.grahamNumber, 0) },
    { label: "Graham Net Net", cell: (x) => nf(x.grahamNetNet, 0) },
  ]);
}

function capexPct(v: Num): string {
  return v == null ? DASH : `${nf(v * 100, 0)}%`;
}

// ── Analyst tables ──────────────────────────────────────────────────────────

export function priceTargetsTable(pt: PriceTargets): Grid {
  if (!pt || (pt.current == null && pt.mean == null)) {
    return emptyGrid("No analyst price targets available.");
  }
  const upside =
    pt.current != null && pt.mean != null && pt.current
      ? (pt.mean / pt.current - 1) * 100
      : null;
  return {
    columns: ["", "Current", "Low", "Mean", "Median", "High", "% Upside (Mean)"],
    rows: [
      [
        "Price",
        nf(pt.current ?? null, 2),
        nf(pt.low ?? null, 2),
        nf(pt.mean ?? null, 2),
        nf(pt.median ?? null, 2),
        nf(pt.high ?? null, 2),
        upside == null ? DASH : `${nf(upside, 1)}%`,
      ],
    ],
  };
}

function estimateGrid(rows: EstimateRow[], avgFmt: (v: Num) => string, note: string): Grid {
  if (!rows.length) return emptyGrid(note);
  return {
    columns: ["", "# Analysts", avgLabel(note), "Low", "High", "Year Ago", "YoY Growth"],
    rows: rows.map((e) => [
      e.period,
      nf(e.numberOfAnalysts, 0),
      avgFmt(e.avg),
      avgFmt(e.low),
      avgFmt(e.high),
      avgFmt(e.yearAgo),
      pctSigned(e.growth, 1),
    ]),
  };
}

function avgLabel(note: string): string {
  return note.includes("revenue") ? "Avg Revenue" : "Avg EPS";
}

export function forwardEarningsTable(rows: EstimateRow[]): Grid {
  return estimateGrid(rows, (v) => nf(v, 2), "No forward earnings estimate data available.");
}

export function forwardRevenueTable(rows: EstimateRow[]): Grid {
  return estimateGrid(rows, (v) => billions(v, 2), "No forward revenue estimate data available.");
}

export function earningsHistoryTable(rows: EarningsHistoryRow[]): Grid {
  if (!rows.length) return emptyGrid("No earnings history data available.");
  const desc = [...rows].sort((a, b) => b.date.localeCompare(a.date)); // newest-first
  return {
    columns: ["Quarter", "Estimate", "Actual", "Surprise", "Surprise %"],
    rows: desc.map((e) => [
      e.quarter,
      nf(e.epsEstimate, 2),
      nf(e.epsActual, 2),
      nfSigned(e.epsDifference, 2),
      pctSigned(e.surprisePercent, 1),
    ]),
  };
}

// ── Ownership & insider tables ──────────────────────────────────────────────

export function majorHoldersTable(mh: MajorHolders | null): Grid {
  if (!mh) return emptyGrid("Major holders data unavailable.");
  const p = (v: Num) => (v == null ? DASH : `${nf(v * 100, 2)}%`);
  return {
    columns: ["Metric", "Value"],
    rows: [
      ["% Insider Owned", p(mh.insidersPercentHeld)],
      ["% Institutional Owned", p(mh.institutionsPercentHeld)],
      ["% of Float Held by Institutions", p(mh.institutionsFloatPercentHeld)],
      ["Number of Institutions", nf(mh.institutionsCount, 0)],
    ],
  };
}

export function institutionalHoldersTable(rows: InstitutionalHolder[]): Grid {
  if (!rows.length) return emptyGrid("Institutional holders data unavailable.");
  return {
    columns: ["Institution", "Shares Held", "% of Float", "Value ($)", "% Change", "Date Reported"],
    rows: rows.slice(0, 10).map((h) => [
      h.organization,
      nf(h.shares, 0),
      h.pctHeld == null ? DASH : `${nf(h.pctHeld * 100, 2)}%`,
      nf(h.value, 0),
      h.pctChange == null ? DASH : `${nf(h.pctChange * 100, 2)}%`,
      h.dateReported || DASH,
    ]),
  };
}

export function insiderPurchasesTable(ip: InsiderPurchases | null): Grid {
  if (!ip) return emptyGrid("Insider purchases data unavailable.");
  const p = (v: Num) => (v == null ? DASH : `${nf(v * 100, 2)}%`);
  return {
    columns: ["Metric", "Shares", "Transactions"],
    rows: [
      ["Purchases", nf(ip.buyShares, 0), nf(ip.buyCount, 0)],
      ["Sales", nf(ip.sellShares, 0), nf(ip.sellCount, 0)],
      ["Net Shares Purchased (Sold)", nf(ip.netShares, 0), nf(ip.netCount, 0)],
      ["% Net Insider Shares", p(ip.netPercentInsiderShares), ""],
      ["Total Insider Shares Held", nf(ip.totalInsiderShares, 0), ""],
    ],
  };
}

export function insiderTransactionsTable(rows: InsiderTransaction[]): Grid {
  if (!rows.length) return emptyGrid("Insider transactions data unavailable.");
  return {
    columns: ["Insider", "Position", "Type", "Shares", "Value ($)", "Date", "Ownership"],
    rows: rows.slice(0, 15).map((t) => [
      t.insider || DASH,
      t.position || DASH,
      t.type || DASH,
      nf(t.shares, 0),
      nf(t.value, 0),
      t.date || DASH,
      t.ownership || DASH,
    ]),
  };
}
