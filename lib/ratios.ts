// Port of ratios.py compute(): builds per-year ratios and key metrics from the
// aligned (newest-first) statement arrays. Field names match the FMP-style names
// so each formula mirrors the original line-for-line.

import { FetchedData, MetricRow, Num, RatioRow } from "./types";
import { abs, addOr0, safeDiv, toNum } from "./math";

function allNull(arr: Num[]): boolean {
  return arr.every((v) => v == null);
}

export function compute(data: FetchedData): {
  ratios: RatioRow[];
  metrics: MetricRow[];
} {
  const is = data.income;
  const bs = data.balance;
  const cf = data.cashflow;
  const n = is.length;

  const priceYear = data.priceByDate;

  // Shares: balance sheet sharesOutstanding, else fallback for every row.
  let sharesYear: Num[] = bs.map((b) => toNum(b.sharesOutstanding));
  if (allNull(sharesYear)) sharesYear = is.map(() => data.fallbackShares);

  const marketCapYear: Num[] = priceYear.map((p, i) =>
    p == null || sharesYear[i] == null ? null : (p as number) * (sharesYear[i] as number),
  );

  // FCF: cash-flow freeCashFlow, else OCF - |capex|.
  let fcf: Num[] = cf.map((c) => toNum(c.freeCashFlow));
  if (allNull(fcf)) {
    fcf = cf.map((c) => {
      const ocf = toNum(c.netCashProvidedByOperatingActivities);
      const capex = abs(toNum(c.capitalExpenditure));
      return ocf == null || capex == null ? null : ocf - capex;
    });
  }

  // EBITDA: income ebitda, else operatingIncome + |D&A|.
  let ebitda: Num[] = is.map((r) => toNum(r.ebitda));
  if (allNull(ebitda)) {
    ebitda = is.map((r, i) => {
      const oi = toNum(r.operatingIncome);
      const da = abs(toNum(cf[i]?.depreciationAndAmortization));
      return oi == null || da == null ? null : oi + da;
    });
  }

  const enterpriseValue: Num[] = marketCapYear.map((mc, i) => {
    if (mc == null) return null;
    const debt = addOr0(toNum(bs[i].totalDebt)) ?? 0;
    const cash = addOr0(toNum(bs[i].cashAndEquivalents)) ?? 0;
    return mc + debt - cash;
  });

  const ratios: RatioRow[] = is.map((r, i) => {
    const b = bs[i];
    const c = cf[i];

    const recvTurnover = safeDiv(r.revenue, b.receivables);
    const payTurnover = safeDiv(r.costOfRevenue, b.accountsPayable);
    const invTurnover = safeDiv(r.costOfRevenue, b.inventory);
    const fixedAssetTurnover = safeDiv(r.revenue, b.netPPE);

    const dso = safeDiv(365, recvTurnover);
    const dpo = safeDiv(365, payTurnover);
    const dio = safeDiv(365, invTurnover);

    const quickNumerator =
      b.totalCurrentAssets == null
        ? null
        : (b.totalCurrentAssets as number) - (addOr0(toNum(b.inventory)) ?? 0);

    const add = (a: Num, x: Num): Num =>
      a == null && x == null ? null : (a ?? 0) + (x ?? 0);

    return {
      date: r.date,
      calendarYear: r.calendarYear,
      // Market
      priceToBookRatio: safeDiv(marketCapYear[i], b.totalStockholdersEquity),
      priceToSalesRatio: safeDiv(marketCapYear[i], r.revenue),
      priceEarningsRatio: safeDiv(marketCapYear[i], r.netIncome),
      priceToOperatingCashFlowsRatio: safeDiv(
        marketCapYear[i],
        c.netCashProvidedByOperatingActivities,
      ),
      priceToFreeCashFlowsRatio: safeDiv(marketCapYear[i], fcf[i]),
      dividendYield: safeDiv(abs(toNum(c.dividendsPaid)), marketCapYear[i]),
      enterpriseValueMultiple: safeDiv(enterpriseValue[i], ebitda[i]),
      priceFairValue: null,
      // Debt / liquidity / solvency
      debtRatio: safeDiv(b.totalLiabilities, b.totalAssets),
      debtEquityRatio: safeDiv(b.totalLiabilities, b.totalStockholdersEquity),
      currentRatio: safeDiv(b.totalCurrentAssets, b.totalCurrentLiabilities),
      quickRatio: safeDiv(quickNumerator, b.totalCurrentLiabilities),
      cashRatio: safeDiv(b.cashAndEquivalents, b.totalCurrentLiabilities),
      interestCoverage: safeDiv(r.operatingIncome, abs(toNum(r.interestExpense))),
      cashFlowToDebtRatio: safeDiv(
        c.netCashProvidedByOperatingActivities,
        b.totalLiabilities,
      ),
      // Profitability
      grossProfitMargin: safeDiv(r.grossProfit, r.revenue),
      operatingProfitMargin: safeDiv(r.operatingIncome, r.revenue),
      netProfitMargin: safeDiv(r.netIncome, r.revenue),
      effectiveTaxRate: safeDiv(r.taxProvision, r.pretaxIncome),
      returnOnAssets: safeDiv(r.netIncome, b.totalAssets),
      returnOnEquity: safeDiv(r.netIncome, b.totalStockholdersEquity),
      returnOnInvestedCapital: safeDiv(
        r.netIncome,
        add(toNum(b.totalDebt), toNum(b.totalStockholdersEquity)),
      ),
      returnOnCapitalEmployed: safeDiv(
        r.operatingIncome,
        add(
          toNum(b.totalAssets),
          b.totalCurrentLiabilities == null ? null : -(b.totalCurrentLiabilities as number),
        ),
      ),
      // Efficiency
      daysOfSalesOutstanding: dso,
      daysOfPayablesOutstanding: dpo,
      daysOfInventoryOutstanding: dio,
      operatingCycle: dso == null || dio == null ? null : dso + dio,
      cashConversionCycle:
        dso == null || dio == null || dpo == null ? null : dso + dio - dpo,
      receivablesTurnover: recvTurnover,
      payablesTurnover: payTurnover,
      inventoryTurnover: invTurnover,
      fixedAssetTurnover,
      assetTurnover: safeDiv(r.revenue, b.totalAssets),
    };
  });

  const metrics: MetricRow[] = is.map((r, i) => {
    const b = bs[i];
    const c = cf[i];
    const eps = safeDiv(r.netIncome, sharesYear[i]);
    const bvps = safeDiv(b.totalStockholdersEquity, sharesYear[i]);

    let grahamNumber: Num = null;
    if (eps != null && bvps != null && eps > 0 && bvps > 0) {
      grahamNumber = Math.sqrt(22.5 * eps * bvps);
    }

    const netNetNum =
      b.totalCurrentAssets == null || b.totalLiabilities == null
        ? null
        : (b.totalCurrentAssets as number) - (b.totalLiabilities as number);

    return {
      date: r.date,
      calendarYear: r.calendarYear,
      marketCap: marketCapYear[i],
      netIncomePerShare: eps,
      freeCashFlowPerShare: safeDiv(fcf[i], sharesYear[i]),
      bookValuePerShare: bvps,
      shareholdersEquityPerShare: bvps,
      capexToOperatingCashFlow: safeDiv(
        abs(toNum(c.capitalExpenditure)),
        c.netCashProvidedByOperatingActivities,
      ),
      capexToRevenue: safeDiv(abs(toNum(c.capitalExpenditure)), r.revenue),
      capexToDepreciation: safeDiv(
        abs(toNum(c.capitalExpenditure)),
        abs(toNum(c.depreciationAndAmortization)),
      ),
      grahamNumber,
      grahamNetNet: safeDiv(netNetNum, sharesYear[i]),
    };
  });

  return { ratios, metrics };
}

// trim_and_reverse: keep the last `years` (newest-first input) then reverse to
// oldest-first so charts/tables read left-to-right chronologically.
export function trimAndReverse<T>(rows: T[], years: number): T[] {
  return rows.slice(-years).reverse();
}
