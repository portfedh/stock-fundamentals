// buildReport(): single source of truth used by both the JSON route and the PDF
// route, so the interactive page and the PDF always show identical numbers.
// Mirrors orchestrator.run(): fetch → compute → trim → render tables/charts.

import { fetchCompany } from "./yahoo";
import { compute, trimAndReverse } from "./ratios";
import { ChartOption } from "./charts";
import * as charts from "./charts";
import * as tables from "./tables";
import { Grid } from "./grid";
import { Profile } from "./types";

export interface ReportMeta {
  ticker: string;
  companyName: string;
  companySymbol: string;
  currency: string;
  years: number;
  generatedAt: string; // YYYY-MM-DD
}

export interface Report {
  meta: ReportMeta;
  profile: Profile;
  tables: Record<string, Grid>;
  charts: Record<string, ChartOption | null>;
  flags: {
    hasDividends: boolean;
    hasAnalystRecs: boolean;
    hasEarningsHistory: boolean;
  };
}

async function build(ticker: string, years: number): Promise<Report> {
  const data = await fetchCompany(ticker, years);
  const { ratios, metrics } = compute(data);

  const y = data.years;
  const is = trimAndReverse(data.income, y);
  const bs = trimAndReverse(data.balance, y);
  const cf = trimAndReverse(data.cashflow, y);
  const ratiosT = trimAndReverse(ratios, y);
  const metricsT = trimAndReverse(metrics, y);

  const currency = bs[0]?.reportedCurrency || data.currency || "";
  const company = data.profile.symbol || ticker.toUpperCase();
  const name = data.profile.companyName;

  const hasDividends = data.dividends.length > 0;
  const hasAnalystRecs = data.recommendations.length > 0;
  const hasEarningsHistory = data.earningsHistory.length > 0;

  return {
    meta: {
      ticker: ticker.toUpperCase(),
      companyName: name,
      companySymbol: company,
      currency,
      years: y,
      generatedAt: new Date().toISOString().slice(0, 10),
    },
    profile: data.profile,
    tables: {
      incomeStatement: tables.incomeStatementTable(is),
      incomeStatementCS: tables.incomeStatementCSTable(is),
      balanceSheet: tables.balanceSheetTable(bs),
      balanceSheetCS: tables.balanceSheetCSTable(bs),
      cashFlow: tables.cashFlowTable(cf),
      debtRatios: tables.debtRatiosTable(ratiosT),
      profitRatios: tables.profitRatiosTable(ratiosT),
      efficiencyRatios: tables.efficiencyRatiosTable(ratiosT),
      marketRatios: tables.marketRatiosTable(ratiosT),
      keyMetrics: tables.keyMetricsTable(metricsT),
      priceTargets: tables.priceTargetsTable(data.priceTargets),
      forwardEarnings: tables.forwardEarningsTable(data.earningsEstimate),
      forwardRevenue: tables.forwardRevenueTable(data.revenueEstimate),
      earningsHistory: tables.earningsHistoryTable(data.earningsHistory),
      majorHolders: tables.majorHoldersTable(data.majorHolders),
      institutionalHolders: tables.institutionalHoldersTable(data.institutionalHolders),
      insiderPurchases: tables.insiderPurchasesTable(data.insiderPurchases),
      insiderTransactions: tables.insiderTransactionsTable(data.insiderTransactions),
    },
    charts: {
      incomeStatement: charts.incomeStatementChart(is, company, currency),
      balanceSheet: charts.balanceSheetChart(bs, company, currency),
      cashFlow: charts.cashFlowChart(cf, company, currency),
      incomeStatementCS: charts.incomeStatementCSChart(is, company),
      balanceSheetCS: charts.balanceSheetCSChart(bs, company),
      equityUses: charts.equityUsesChart(bs, cf, company, currency),
      dividendHistory: hasDividends
        ? charts.dividendHistoryChart(data.dividends, company, currency)
        : null,
      analystRecommendations: hasAnalystRecs
        ? charts.analystRecommendationsChart(data.recommendations, company)
        : null,
      earningsHistory: hasEarningsHistory
        ? charts.earningsHistoryChart(data.earningsHistory, company)
        : null,
    },
    flags: { hasDividends, hasAnalystRecs, hasEarningsHistory },
  };
}

// Short-lived cache so a page load + a follow-up PDF download don't double-fetch,
// and to soften Yahoo rate limits under concurrent users. Keyed by ticker+years+day.
const TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, { at: number; promise: Promise<Report> }>();

export function buildReport(ticker: string, years: number): Promise<Report> {
  const key = `${ticker.toUpperCase()}:${years}:${new Date().toISOString().slice(0, 10)}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.promise;
  const promise = build(ticker, years).catch((e) => {
    cache.delete(key); // don't cache failures
    throw e;
  });
  cache.set(key, { at: Date.now(), promise });
  return promise;
}
