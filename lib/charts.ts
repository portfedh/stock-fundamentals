// Port of charts.py to ECharts option objects. Each builder is a pure function
// returning a plain option object reused by both the interactive page
// (echarts-for-react) and the PDF (server-side SSR render).

import {
  BalanceRow,
  CashFlowRow,
  DividendPoint,
  EarningsHistoryRow,
  IncomeRow,
  Num,
  RecommendationRow,
} from "./types";
import { safeDiv } from "./math";

export type ChartOption = Record<string, unknown>;

const num = (v: Num): number | null => (v == null || !isFinite(v) ? null : v);

function base(title: string, xName: string, yName: string, categories: string[]): ChartOption {
  return {
    title: { text: title, left: "center", top: 4, textStyle: { fontSize: 14 } },
    tooltip: { trigger: "axis" },
    legend: { top: 30, type: "scroll" },
    grid: { left: 70, right: 30, top: 64, bottom: 50, containLabel: true },
    xAxis: { type: "category", name: xName, nameLocation: "middle", nameGap: 30, data: categories },
    yAxis: { type: "value", name: yName },
    animation: false,
  };
}

function bar(name: string, color: string, data: (number | null)[], stack?: string): ChartOption {
  const s: ChartOption = { name, type: "bar", color, data };
  if (stack) s.stack = stack;
  return s;
}

export function balanceSheetChart(bs: BalanceRow[], company: string, currency: string): ChartOption {
  const yr = bs.map((r) => r.calendarYear);
  return {
    ...base(`Balance Sheet for: ${company}`, "Year", `Amount $mm ${currency}`, yr),
    series: [
      bar("Assets", "#003B73", bs.map((r) => num(r.totalAssets))),
      bar("Equity", "#01949a", bs.map((r) => num(r.totalStockholdersEquity)), "el"),
      bar("Liabilities", "#db1f48", bs.map((r) => num(r.totalLiabilities)), "el"),
      bar("GW & Intangibles", "#746C70", bs.map((r) => num(r.goodwillAndIntangibleAssets))),
    ],
  };
}

export function balanceSheetCSChart(bs: BalanceRow[], company: string): ChartOption {
  const yr = bs.map((r) => r.calendarYear);
  const pct = (v: Num, r: BalanceRow) => num(mul(safeDiv(v, r.totalAssets), 100));
  return {
    ...base(`Common Size Balance Sheet for: ${company}`, "Year", "Amount %", yr),
    series: [
      bar("Assets", "#003B73", bs.map((r) => pct(r.totalAssets, r))),
      bar("Equity", "#01949a", bs.map((r) => pct(r.totalStockholdersEquity, r)), "el"),
      bar("Liabilities", "#db1f48", bs.map((r) => pct(r.totalLiabilities, r)), "el"),
      bar("GW & Intangibles", "#746C70", bs.map((r) => pct(r.goodwillAndIntangibleAssets, r))),
    ],
  };
}

export function incomeStatementChart(is: IncomeRow[], company: string, currency: string): ChartOption {
  const yr = is.map((r) => r.calendarYear);
  return {
    ...base(`Income Statement for: ${company}`, "Year", `Amount $mm ${currency}`, yr),
    series: [
      bar("Revenue", "#004369", is.map((r) => num(r.revenue))),
      bar("Net Income", "#41729f", is.map((r) => num(r.netIncome))),
      bar("Interest Expense", "#DB1F48", is.map((r) => num(r.interestIncome))),
    ],
  };
}

export function incomeStatementCSChart(is: IncomeRow[], company: string): ChartOption {
  const yr = is.map((r) => r.calendarYear);
  const pct = (v: Num, r: IncomeRow) => num(mul(safeDiv(v, r.revenue), 100));
  return {
    ...base(`Common Size Income Statement for: ${company}`, "Year", "Amount %", yr),
    series: [
      bar("Revenue", "#004369", is.map((r) => pct(r.revenue, r))),
      bar("Net Income", "#41729f", is.map((r) => pct(r.netIncome, r))),
      bar("Interest Expense", "#DB1F48", is.map((r) => pct(r.interestIncome, r))),
    ],
  };
}

export function cashFlowChart(cf: CashFlowRow[], company: string, currency: string): ChartOption {
  const yr = cf.map((r) => r.calendarYear);
  return {
    ...base(`Cash Flow Statement for: ${company}`, "Year", `Amount $mm ${currency}`, yr),
    series: [
      bar("CF Operations", "#01949A", cf.map((r) => num(r.netCashProvidedByOperatingActivities))),
      bar("CF Investing", "#004369", cf.map((r) => num(r.netCashUsedForInvestingActivites))),
      bar("CF Financing", "#DB1F48", cf.map((r) => num(r.netCashUsedProvidedByFinancingActivities))),
    ],
  };
}

export function equityUsesChart(
  bs: BalanceRow[],
  cf: CashFlowRow[],
  company: string,
  currency: string,
): ChartOption {
  const x = bs.map((r) => r.date);
  // Mirrors charts.py: beginning equity = shift(-1) of equity (oldest-first input).
  const beginning = bs.map((_, i) => num(bs[i + 1]?.totalStockholdersEquity ?? null));
  const netIncome = cf.map((r) => num(r.netIncome));
  const dividends = cf.map((r) => num(r.dividendsPaid));
  const endingExpected = bs.map((_, i) => {
    const b = beginning[i];
    const ni = netIncome[i];
    const dv = dividends[i];
    return b == null || ni == null || dv == null ? null : b + ni + dv;
  });
  return {
    ...base(`Equity Uses for: ${company}`, "Year", `Amount $mm ${currency}`, x),
    series: [
      bar("Beginning Equity", "#738fa7", beginning),
      bar("NetIncome", "#005f73", netIncome),
      bar("Dividends", "#0a9396", dividends),
      bar("Ending Equity (expected)", "#41729f", endingExpected),
      bar("Ending Equity (real)", "#004369", bs.map((r) => num(r.totalStockholdersEquity))),
    ],
  };
}

export function dividendHistoryChart(div: DividendPoint[], company: string, currency: string): ChartOption {
  return {
    ...base(`Dividend History for: ${company}`, "Year", `Dividends per share (${currency})`, div.map((d) => d.year)),
    legend: { show: false },
    series: [bar("Dividends per share", "#0a9396", div.map((d) => d.amount))],
  };
}

export function analystRecommendationsChart(recs: RecommendationRow[], company: string): ChartOption {
  const ordered = [...recs].reverse(); // oldest-first
  const yr = ordered.map((r) => r.period);
  return {
    ...base(`Analyst Recommendations for: ${company}`, "Period", "# of Analysts", yr),
    series: [
      bar("Strong Buy", "#004369", ordered.map((r) => num(r.strongBuy)), "rec"),
      bar("Buy", "#01949A", ordered.map((r) => num(r.buy)), "rec"),
      bar("Hold", "#746C70", ordered.map((r) => num(r.hold)), "rec"),
      bar("Sell", "#DB1F48", ordered.map((r) => num(r.sell)), "rec"),
      bar("Strong Sell", "#8B0000", ordered.map((r) => num(r.strongSell)), "rec"),
    ],
  };
}

export function earningsHistoryChart(rows: EarningsHistoryRow[], company: string): ChartOption {
  const asc = [...rows].sort((a, b) => a.date.localeCompare(b.date)); // oldest-first
  const yr = asc.map((r) => r.quarter);
  return {
    ...base(`EPS: Estimate vs Actual for: ${company}`, "Quarter", "EPS", yr),
    series: [
      bar("Estimate", "#746C70", asc.map((r) => num(r.epsEstimate))),
      bar("Actual", "#004369", asc.map((r) => num(r.epsActual))),
    ],
  };
}

function mul(v: Num, k: number): Num {
  return v == null ? null : v * k;
}
