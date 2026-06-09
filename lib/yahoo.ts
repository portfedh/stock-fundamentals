// Data layer: fetch + reshape Yahoo Finance data into the FMP-style FetchedData
// the computations expect. Mirrors fetch.py. Statements are returned newest-first.

import YahooFinance from "yahoo-finance2";
import { lookupIsin } from "./isin";
import { toNum } from "./math";
import {
  BalanceRow,
  CashFlowRow,
  DividendPoint,
  EarningsHistoryRow,
  EstimateRow,
  FetchedData,
  IncomeRow,
  InsiderPurchases,
  InsiderTransaction,
  InstitutionalHolder,
  MajorHolders,
  Num,
  Profile,
  RecommendationRow,
} from "./types";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey", "ripHistorical"] });

type Row = Record<string, unknown>;

const gv = (o: Row | undefined, k: string): Num => {
  if (!o) return null;
  const v = o[k];
  if (v && typeof v === "object" && "raw" in (v as Row)) return toNum((v as Row).raw);
  return toNum(v);
};

function isoDate(v: unknown): string {
  if (!v) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

function quarterLabel(dateIso: string): string {
  const d = new Date(dateIso);
  const q = Math.floor(d.getUTCMonth() / 3) + 1;
  return `${d.getUTCFullYear()}Q${q}`;
}

const PERIOD_LABELS: Record<string, string> = {
  "0q": "Current Qtr",
  "+1q": "Next Qtr",
  "0y": "Current Yr",
  "+1y": "Next Yr",
};

async function safeQuoteSummary(symbol: string, modules: string[]): Promise<Row> {
  try {
    return (await yf.quoteSummary(symbol, {
      modules: modules as never,
    })) as unknown as Row;
  } catch {
    // Fetch modules individually so one bad module doesn't sink the rest.
    const out: Row = {};
    for (const m of modules) {
      try {
        const r = (await yf.quoteSummary(symbol, { modules: [m] as never })) as unknown as Row;
        Object.assign(out, r);
      } catch {
        /* tolerate missing module */
      }
    }
    return out;
  }
}

export async function fetchCompany(ticker: string, years: number): Promise<FetchedData> {
  const symbol = ticker.toUpperCase();
  const now = new Date();
  const sixYearsAgo = new Date(now.getTime() - 6 * 365 * 24 * 3600 * 1000);
  const elevenYearsAgo = new Date(now.getTime() - 11 * 365 * 24 * 3600 * 1000);

  const [ftsRaw, qs, priceChart, divChart, isin] = await Promise.all([
    yf
      .fundamentalsTimeSeries(symbol, {
        period1: sixYearsAgo,
        period2: now,
        type: "annual",
        module: "all",
      })
      .catch(() => [] as Row[]),
    safeQuoteSummary(symbol, [
      "assetProfile",
      "price",
      "summaryDetail",
      "defaultKeyStatistics",
      "financialData",
      "recommendationTrend",
      "earningsTrend",
      "earningsHistory",
      "majorHoldersBreakdown",
      "institutionOwnership",
      "insiderTransactions",
      "netSharePurchaseActivity",
      "calendarEvents",
    ]),
    yf
      .chart(symbol, { period1: sixYearsAgo, period2: now, interval: "1d" })
      .catch(() => ({ quotes: [] }) as { quotes: Row[] }),
    yf
      .chart(symbol, { period1: elevenYearsAgo, period2: now, interval: "1mo", events: "dividends" })
      .catch(() => ({ events: {} }) as { events?: { dividends?: Record<string, Row> } }),
    lookupIsin(symbol),
  ]);

  // Statements: one combined FTS row per period; sort newest-first.
  // Drop empty edge rows (the date window can clip a partial fiscal year that
  // carries a date but no financials).
  const fts = (Array.isArray(ftsRaw) ? (ftsRaw as Row[]) : []).filter(
    (r) => r && r.date && (gv(r, "totalRevenue") != null || gv(r, "totalAssets") != null),
  );
  fts.sort((a, b) => isoDate(b.date).localeCompare(isoDate(a.date)));

  const price = (qs.price ?? {}) as Row;
  const currency = (price.currency as string) || "";

  const income: IncomeRow[] = fts.map((r) => ({
    date: isoDate(r.date),
    calendarYear: String(new Date(isoDate(r.date)).getUTCFullYear()),
    revenue: gv(r, "totalRevenue"),
    costOfRevenue: gv(r, "costOfRevenue"),
    grossProfit: gv(r, "grossProfit"),
    operatingExpenses: gv(r, "operatingExpense"),
    operatingIncome: gv(r, "operatingIncome"),
    netIncome: gv(r, "netIncome"),
    interestIncome: gv(r, "interestIncome"),
    interestExpense: gv(r, "interestExpense"),
    taxProvision: gv(r, "taxProvision"),
    pretaxIncome: gv(r, "pretaxIncome"),
    ebitda: gv(r, "EBITDA") ?? gv(r, "normalizedEBITDA"),
  }));

  const balance: BalanceRow[] = fts.map((r) => ({
    date: isoDate(r.date),
    calendarYear: String(new Date(isoDate(r.date)).getUTCFullYear()),
    totalCurrentAssets: gv(r, "currentAssets"),
    totalNonCurrentAssets: gv(r, "totalNonCurrentAssets"),
    totalAssets: gv(r, "totalAssets"),
    totalCurrentLiabilities: gv(r, "currentLiabilities"),
    totalNonCurrentLiabilities: gv(r, "totalNonCurrentLiabilitiesNetMinorityInterest"),
    totalLiabilities: gv(r, "totalLiabilitiesNetMinorityInterest"),
    totalStockholdersEquity: gv(r, "stockholdersEquity"),
    goodwillAndIntangibleAssets: gv(r, "goodwillAndOtherIntangibleAssets"),
    inventory: gv(r, "inventory"),
    cashAndEquivalents: gv(r, "cashAndCashEquivalents") ?? gv(r, "cashEquivalents"),
    receivables: gv(r, "receivables") ?? gv(r, "accountsReceivable"),
    accountsPayable: gv(r, "accountsPayable"),
    netPPE: gv(r, "netPPE"),
    totalDebt: gv(r, "totalDebt"),
    sharesOutstanding: gv(r, "ordinarySharesNumber") ?? gv(r, "shareIssued"),
    reportedCurrency: currency,
  }));

  const cashflow: CashFlowRow[] = fts.map((r) => ({
    date: isoDate(r.date),
    calendarYear: String(new Date(isoDate(r.date)).getUTCFullYear()),
    netCashProvidedByOperatingActivities: gv(r, "operatingCashFlow"),
    netCashUsedForInvestingActivites: gv(r, "investingCashFlow"),
    netCashUsedProvidedByFinancingActivities: gv(r, "financingCashFlow"),
    netChangeInCash: gv(r, "changesInCash"),
    cashAtEndOfPeriod: gv(r, "endCashPosition"),
    cashAtBeginningOfPeriod: gv(r, "beginningCashPosition"),
    netIncome: gv(r, "netIncome"),
    dividendsPaid: gv(r, "cashDividendsPaid"),
    capitalExpenditure: gv(r, "capitalExpenditure"),
    freeCashFlow: gv(r, "freeCashFlow"),
    depreciationAndAmortization:
      gv(r, "depreciationAndAmortization") ?? gv(r, "depreciationAmortizationDepletion"),
  }));

  // Year-end close aligned to each income period (unadjusted close).
  const quotes = ((priceChart as { quotes?: Row[] }).quotes ?? [])
    .map((q) => ({ date: isoDate(q.date), close: gv(q, "close") }))
    .filter((q) => q.close != null)
    .sort((a, b) => a.date.localeCompare(b.date));
  const priceByDate: Num[] = income.map((r) => {
    let last: Num = null;
    for (const q of quotes) {
      if (q.date <= r.date) last = q.close;
      else break;
    }
    return last;
  });

  // Profile.
  const assetProfile = (qs.assetProfile ?? {}) as Row;
  const summaryDetail = (qs.summaryDetail ?? {}) as Row;
  const keyStats = (qs.defaultKeyStatistics ?? {}) as Row;
  const officers = (assetProfile.companyOfficers as Row[]) || [];
  const calEvents = (qs.calendarEvents ?? {}) as Row;
  let nextEarnings = "";
  const earningsField = calEvents.earnings as unknown;
  if (Array.isArray(earningsField)) nextEarnings = isoDate(earningsField[0]);
  else if (earningsField && typeof earningsField === "object") {
    const ed = (earningsField as Row).earningsDate as unknown[];
    if (Array.isArray(ed) && ed.length) nextEarnings = isoDate(ed[0]);
  }

  const profile: Profile = {
    companyName: (price.longName as string) || (price.shortName as string) || symbol,
    symbol: (price.symbol as string) || symbol,
    mktCap: gv(price, "marketCap"),
    beta: gv(summaryDetail, "beta") ?? gv(keyStats, "beta"),
    currency,
    isin: isin || (typeof keyStats.isin === "string" ? (keyStats.isin as string) : "") || "",
    exchange: (price.exchangeName as string) || (price.exchange as string) || "",
    industry: (assetProfile.industry as string) || "",
    website: (assetProfile.website as string) || "",
    sector: (assetProfile.sector as string) || "",
    country: (assetProfile.country as string) || "",
    fullTimeEmployees: gv(assetProfile, "fullTimeEmployees"),
    ceo: (officers[0]?.name as string) || "",
    description: (assetProfile.longBusinessSummary as string) || "",
    nextEarningsDate: nextEarnings,
  };

  // Analyst.
  const financialData = (qs.financialData ?? {}) as Row;
  const priceTargets = {
    current: gv(financialData, "currentPrice"),
    low: gv(financialData, "targetLowPrice"),
    mean: gv(financialData, "targetMeanPrice"),
    median: gv(financialData, "targetMedianPrice"),
    high: gv(financialData, "targetHighPrice"),
  };

  const recTrend = ((qs.recommendationTrend as Row)?.trend as Row[]) || [];
  const recommendations: RecommendationRow[] = recTrend.map((t) => ({
    period: String(t.period),
    strongBuy: gv(t, "strongBuy"),
    buy: gv(t, "buy"),
    hold: gv(t, "hold"),
    sell: gv(t, "sell"),
    strongSell: gv(t, "strongSell"),
  }));

  const trend = ((qs.earningsTrend as Row)?.trend as Row[]) || [];
  const earningsEstimate: EstimateRow[] = [];
  const revenueEstimate: EstimateRow[] = [];
  for (const t of trend) {
    const p = String(t.period);
    if (!(p in PERIOD_LABELS)) continue;
    const ee = (t.earningsEstimate ?? {}) as Row;
    const re = (t.revenueEstimate ?? {}) as Row;
    earningsEstimate.push({
      period: PERIOD_LABELS[p],
      numberOfAnalysts: gv(ee, "numberOfAnalysts"),
      avg: gv(ee, "avg"),
      low: gv(ee, "low"),
      high: gv(ee, "high"),
      yearAgo: gv(ee, "yearAgoEps"),
      growth: gv(ee, "growth"),
    });
    revenueEstimate.push({
      period: PERIOD_LABELS[p],
      numberOfAnalysts: gv(re, "numberOfAnalysts"),
      avg: gv(re, "avg"),
      low: gv(re, "low"),
      high: gv(re, "high"),
      yearAgo: gv(re, "yearAgoRevenue"),
      growth: gv(re, "growth"),
    });
  }

  const ehHistory = ((qs.earningsHistory as Row)?.history as Row[]) || [];
  const earningsHistory: EarningsHistoryRow[] = ehHistory.map((h) => {
    const d = isoDate(h.quarter);
    return {
      quarter: d ? quarterLabel(d) : String(h.period ?? ""),
      date: d,
      epsEstimate: gv(h, "epsEstimate"),
      epsActual: gv(h, "epsActual"),
      epsDifference: gv(h, "epsDifference"),
      surprisePercent: gv(h, "surprisePercent"),
    };
  });

  // Ownership.
  const mhb = qs.majorHoldersBreakdown as Row | undefined;
  const majorHolders: MajorHolders | null = mhb
    ? {
        insidersPercentHeld: gv(mhb, "insidersPercentHeld"),
        institutionsPercentHeld: gv(mhb, "institutionsPercentHeld"),
        institutionsFloatPercentHeld: gv(mhb, "institutionsFloatPercentHeld"),
        institutionsCount: gv(mhb, "institutionsCount"),
      }
    : null;

  const ownershipList = ((qs.institutionOwnership as Row)?.ownershipList as Row[]) || [];
  const institutionalHolders: InstitutionalHolder[] = ownershipList.map((o) => ({
    organization: (o.organization as string) || "",
    shares: gv(o, "position"),
    pctHeld: gv(o, "pctHeld"),
    value: gv(o, "value"),
    pctChange: gv(o, "pctChange"),
    dateReported: isoDate(o.reportDate),
  }));

  // Insider.
  const nspa = qs.netSharePurchaseActivity as Row | undefined;
  const insiderPurchases: InsiderPurchases | null = nspa
    ? {
        buyShares: gv(nspa, "buyInfoShares"),
        buyCount: gv(nspa, "buyInfoCount"),
        sellShares: gv(nspa, "sellInfoShares"),
        sellCount: gv(nspa, "sellInfoCount"),
        netShares: gv(nspa, "netInfoShares"),
        netCount: gv(nspa, "netInfoCount"),
        netPercentInsiderShares: gv(nspa, "netPercentInsiderShares"),
        totalInsiderShares: gv(nspa, "totalInsiderShares"),
      }
    : null;

  const txns = ((qs.insiderTransactions as Row)?.transactions as Row[]) || [];
  const insiderTransactions: InsiderTransaction[] = txns.map((t) => ({
    insider: (t.filerName as string) || "",
    position: (t.filerRelation as string) || "",
    type: ((t.transactionText as string) || "").split(" at ")[0].trim(),
    shares: gv(t, "shares"),
    value: gv(t, "value"),
    date: isoDate(t.startDate),
    ownership: (t.ownership as string) || "",
  }));

  // Dividends: annual sums, last 10 years, oldest-first.
  const divEvents = (divChart as { events?: { dividends?: Record<string, Row> } }).events?.dividends ?? {};
  const byYear = new Map<string, number>();
  for (const ev of Object.values(divEvents)) {
    const amt = gv(ev, "amount");
    if (amt == null) continue;
    const yr = isoDate(ev.date).slice(0, 4);
    if (!yr) continue;
    byYear.set(yr, (byYear.get(yr) ?? 0) + amt);
  }
  const dividends: DividendPoint[] = [...byYear.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-10)
    .map(([year, amount]) => ({ year, amount }));

  const cappedYears = Math.min(years, income.length, balance.length, cashflow.length);

  return {
    income,
    balance,
    cashflow,
    profile,
    recommendations,
    priceTargets,
    earningsEstimate,
    revenueEstimate,
    earningsHistory,
    dividends,
    majorHolders,
    institutionalHolders,
    insiderPurchases,
    insiderTransactions,
    priceByDate,
    fallbackShares: gv(keyStats, "sharesOutstanding"),
    years: cappedYears,
    currency,
  };
}
