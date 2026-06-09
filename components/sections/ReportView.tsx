import { Report } from "@/lib/report";
import { Profile } from "@/lib/types";
import { ChartOption } from "@/lib/charts";
import DataTable from "@/components/DataTable";
import EChart from "@/components/charts/EChart";
import { nf } from "@/lib/format";

function Section({
  num,
  title,
  children,
}: {
  num: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="report-section">
      <h2>
        <span className="pagenum">{num}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Block({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="block">
      {title && <h3>{title}</h3>}
      {children}
    </div>
  );
}

function Chart({ option, title }: { option: ChartOption | null; title: string }) {
  if (!option) return <Block title={title}><p className="muted">No data available.</p></Block>;
  return (
    <Block title={title}>
      <EChart option={option} />
    </Block>
  );
}

function ProfileGrid({ p, currency }: { p: Profile; currency: string }) {
  const rows: [string, string][] = [
    ["Company Name", p.companyName],
    ["Company Symbol", p.symbol],
    ["Market Cap", nf(p.mktCap, 0)],
    ["Beta", nf(p.beta, 2)],
    ["Currency", p.currency || currency || "—"],
    ["ISIN", p.isin || "—"],
    ["Exchange", p.exchange || "—"],
    ["Industry", p.industry || "—"],
    ["Sector", p.sector || "—"],
    ["Country", p.country || "—"],
    ["No. Employees", nf(p.fullTimeEmployees, 0)],
    ["CEO", p.ceo || "—"],
    ["Website", p.website || "—"],
    ["Next Earnings Date", p.nextEarningsDate || "—"],
  ];
  return (
    <dl className="profile-grid">
      {rows.map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function ReportView({ report }: { report: Report }) {
  const { tables: t, charts: c, profile, meta } = report;
  return (
    <div className="report">
      <Section num={1} title="Company Summary">
        <ProfileGrid p={profile} currency={meta.currency} />
        {profile.description && <p className="description">{profile.description}</p>}
      </Section>

      <Section num={2} title="Financial Statements">
        <p className="muted">Amounts in {meta.currency} (Millions)</p>
        <div className="two-col">
          <Block title="Income Statement"><DataTable grid={t.incomeStatement} /></Block>
          <Block title="Common Size Income Statement"><DataTable grid={t.incomeStatementCS} /></Block>
          <Block title="Balance Sheet"><DataTable grid={t.balanceSheet} /></Block>
          <Block title="Common Size Balance Sheet"><DataTable grid={t.balanceSheetCS} /></Block>
        </div>
        <Block title="Cash Flow Statement"><DataTable grid={t.cashFlow} /></Block>
      </Section>

      <Section num={3} title="Financial Summary — Risk & Returns">
        <Block title="Debt Ratios"><DataTable grid={t.debtRatios} /></Block>
        <Block title="Profit Ratios"><DataTable grid={t.profitRatios} /></Block>
        <Block title="Efficiency Ratios"><DataTable grid={t.efficiencyRatios} /></Block>
      </Section>

      <Section num={4} title="Financial Summary — Valuation">
        <Block title="Market Ratios"><DataTable grid={t.marketRatios} /></Block>
        <Block title="Key Metrics"><DataTable grid={t.keyMetrics} /></Block>
      </Section>

      <Section num={5} title="Statement Graphs">
        <Chart option={c.incomeStatement} title="Income Statement" />
        <Chart option={c.balanceSheet} title="Balance Sheet" />
        <Chart option={c.cashFlow} title="Cash Flow Statement" />
      </Section>

      <Section num={6} title="Common Size Graphs & Equity Uses">
        <Chart option={c.incomeStatementCS} title="Common Size Income Statement" />
        <Chart option={c.balanceSheetCS} title="Common Size Balance Sheet" />
        <Chart option={c.equityUses} title="Equity Uses" />
      </Section>

      <Section num={7} title="Dividends & Analyst Consensus">
        <Chart option={c.dividendHistory} title="Dividend History" />
        <Chart option={c.analystRecommendations} title="Analyst Recommendations" />
        <Block title="Analyst Price Targets"><DataTable grid={t.priceTargets} /></Block>
      </Section>

      <Section num={8} title="EPS: Estimate vs Actual">
        <Chart option={c.earningsHistory} title="EPS: Estimate vs Actual (Recent Quarters)" />
        <Block title="Earnings Surprises Table"><DataTable grid={t.earningsHistory} /></Block>
      </Section>

      <Section num={9} title="Forward Estimates">
        <Block title="Forward Earnings Estimate (EPS)"><DataTable grid={t.forwardEarnings} /></Block>
        <Block title="Forward Revenue Estimate"><DataTable grid={t.forwardRevenue} /></Block>
      </Section>

      <Section num={10} title="Ownership Breakdown">
        <Block title="Major Holders Summary"><DataTable grid={t.majorHolders} /></Block>
        <Block title="Top 10 Institutional Holders"><DataTable grid={t.institutionalHolders} /></Block>
      </Section>

      <Section num={11} title="Insider Transactions">
        <Block title="Insider Purchases Summary (Last 6 Months)"><DataTable grid={t.insiderPurchases} /></Block>
        <Block title="Recent Insider Transactions"><DataTable grid={t.insiderTransactions} /></Block>
      </Section>
    </div>
  );
}
