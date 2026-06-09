// Shared types for the fundamental-analysis report.
// Statement field names mirror the FMP-style names used by the original
// Python project (fetch.py rename maps) so the ratio math ports 1:1.

export type Num = number | null;

export interface Period {
  date: string; // YYYY-MM-DD (period end)
  calendarYear: string; // e.g. "2024"
}

export interface IncomeRow extends Period {
  revenue: Num;
  costOfRevenue: Num;
  grossProfit: Num;
  operatingExpenses: Num;
  operatingIncome: Num;
  netIncome: Num;
  interestIncome: Num;
  interestExpense: Num;
  taxProvision: Num;
  pretaxIncome: Num;
  ebitda: Num;
}

export interface BalanceRow extends Period {
  totalCurrentAssets: Num;
  totalNonCurrentAssets: Num;
  totalAssets: Num;
  totalCurrentLiabilities: Num;
  totalNonCurrentLiabilities: Num;
  totalLiabilities: Num;
  totalStockholdersEquity: Num;
  goodwillAndIntangibleAssets: Num;
  inventory: Num;
  cashAndEquivalents: Num;
  receivables: Num;
  accountsPayable: Num;
  netPPE: Num;
  totalDebt: Num;
  sharesOutstanding: Num;
  reportedCurrency: string;
}

export interface CashFlowRow extends Period {
  netCashProvidedByOperatingActivities: Num;
  netCashUsedForInvestingActivites: Num;
  netCashUsedProvidedByFinancingActivities: Num;
  netChangeInCash: Num;
  cashAtEndOfPeriod: Num;
  cashAtBeginningOfPeriod: Num;
  netIncome: Num;
  dividendsPaid: Num;
  capitalExpenditure: Num;
  freeCashFlow: Num;
  depreciationAndAmortization: Num;
}

export interface RatioRow extends Period {
  priceToBookRatio: Num;
  priceToSalesRatio: Num;
  priceEarningsRatio: Num;
  priceToOperatingCashFlowsRatio: Num;
  priceToFreeCashFlowsRatio: Num;
  dividendYield: Num;
  enterpriseValueMultiple: Num;
  priceFairValue: Num;
  debtRatio: Num;
  debtEquityRatio: Num;
  currentRatio: Num;
  quickRatio: Num;
  cashRatio: Num;
  interestCoverage: Num;
  cashFlowToDebtRatio: Num;
  grossProfitMargin: Num;
  operatingProfitMargin: Num;
  netProfitMargin: Num;
  effectiveTaxRate: Num;
  returnOnAssets: Num;
  returnOnEquity: Num;
  returnOnInvestedCapital: Num;
  returnOnCapitalEmployed: Num;
  daysOfSalesOutstanding: Num;
  daysOfPayablesOutstanding: Num;
  daysOfInventoryOutstanding: Num;
  operatingCycle: Num;
  cashConversionCycle: Num;
  receivablesTurnover: Num;
  payablesTurnover: Num;
  inventoryTurnover: Num;
  fixedAssetTurnover: Num;
  assetTurnover: Num;
}

export interface MetricRow extends Period {
  marketCap: Num;
  netIncomePerShare: Num;
  freeCashFlowPerShare: Num;
  bookValuePerShare: Num;
  shareholdersEquityPerShare: Num;
  capexToOperatingCashFlow: Num;
  capexToRevenue: Num;
  capexToDepreciation: Num;
  grahamNumber: Num;
  grahamNetNet: Num;
}

export interface Profile {
  companyName: string;
  symbol: string;
  mktCap: Num;
  beta: Num;
  currency: string;
  isin: string;
  exchange: string;
  industry: string;
  website: string;
  sector: string;
  country: string;
  fullTimeEmployees: Num;
  ceo: string;
  description: string;
  nextEarningsDate: string;
}

export interface PriceTargets {
  current?: Num;
  low?: Num;
  mean?: Num;
  median?: Num;
  high?: Num;
}

export interface RecommendationRow {
  period: string;
  strongBuy: Num;
  buy: Num;
  hold: Num;
  sell: Num;
  strongSell: Num;
}

export interface EstimateRow {
  period: string; // 0q / +1q / 0y / +1y
  numberOfAnalysts: Num;
  avg: Num;
  low: Num;
  high: Num;
  yearAgo: Num;
  growth: Num;
}

export interface EarningsHistoryRow {
  quarter: string; // label like 2025Q2
  date: string;
  epsEstimate: Num;
  epsActual: Num;
  epsDifference: Num;
  surprisePercent: Num;
}

export interface MajorHolders {
  insidersPercentHeld: Num;
  institutionsPercentHeld: Num;
  institutionsFloatPercentHeld: Num;
  institutionsCount: Num;
}

export interface InstitutionalHolder {
  organization: string;
  shares: Num;
  pctHeld: Num;
  value: Num;
  pctChange: Num;
  dateReported: string;
}

export interface InsiderPurchases {
  buyShares: Num;
  buyCount: Num;
  sellShares: Num;
  sellCount: Num;
  netShares: Num;
  netCount: Num;
  netPercentInsiderShares: Num;
  totalInsiderShares: Num;
}

export interface InsiderTransaction {
  insider: string;
  position: string;
  type: string;
  shares: Num;
  value: Num;
  date: string;
  ownership: string;
}

export interface DividendPoint {
  year: string;
  amount: number;
}

// Raw, aligned, newest-first data straight from Yahoo (pre-trim).
export interface FetchedData {
  income: IncomeRow[];
  balance: BalanceRow[];
  cashflow: CashFlowRow[];
  profile: Profile;
  recommendations: RecommendationRow[];
  priceTargets: PriceTargets;
  earningsEstimate: EstimateRow[];
  revenueEstimate: EstimateRow[];
  earningsHistory: EarningsHistoryRow[];
  dividends: DividendPoint[]; // annual sums, oldest-first, last 10y
  majorHolders: MajorHolders | null;
  institutionalHolders: InstitutionalHolder[];
  insiderPurchases: InsiderPurchases | null;
  insiderTransactions: InsiderTransaction[];
  priceByDate: Num[]; // year-end close aligned to income rows
  fallbackShares: Num;
  years: number;
  currency: string;
}
