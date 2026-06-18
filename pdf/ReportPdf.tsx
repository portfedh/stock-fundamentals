/* eslint-disable jsx-a11y/alt-text */
// 11-page PDF mirroring pdf_report.py: header (date + company), footer
// (data source + page number), and the same 11 sections. Charts are pre-rendered
// to PNG (ECharts SSR -> resvg-js); tables are drawn with react-pdf primitives.
import React from "react";
import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import { Report } from "@/lib/report";
import { Grid } from "@/lib/grid";
import { ChartOption } from "@/lib/charts";
import { chartToPng } from "./chartToPng";

const C = { accent: "#003b73", line: "#cdd6df", head: "#003b73", muted: "#6b7785" };

const s = StyleSheet.create({
  page: { paddingTop: 64, paddingBottom: 48, paddingHorizontal: 40, fontSize: 9, color: "#1a2330" },
  header: { position: "absolute", top: 18, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", color: C.accent },
  headerDate: { fontSize: 8, color: C.muted, fontFamily: "Helvetica-Oblique" },
  footer: { position: "absolute", bottom: 20, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between" },
  footerText: { fontSize: 8, color: C.muted, fontFamily: "Helvetica-Oblique" },
  h2: { fontSize: 13, fontFamily: "Helvetica-Bold", color: C.accent, marginBottom: 8, borderBottomWidth: 1, borderBottomColor: C.line, paddingBottom: 4 },
  h3: { fontSize: 9, fontFamily: "Helvetica-Bold", marginTop: 10, marginBottom: 4 },
  note: { fontSize: 9, fontStyle: "italic", color: C.muted, marginTop: 4 },
  chart: { width: "100%", height: 200, objectFit: "contain", marginBottom: 6 },
  profileRow: { flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 0.5, borderBottomColor: C.line, paddingVertical: 2 },
  profileKey: { color: C.muted },
  profileVal: { fontFamily: "Helvetica-Bold" },
  description: { marginTop: 12, lineHeight: 1.4, textAlign: "justify" },
  // table
  tRow: { flexDirection: "row" },
  tCell: { borderWidth: 0.5, borderColor: C.line, padding: 3, fontSize: 7.5 },
  tHeadCell: { backgroundColor: C.head, color: "#fff", fontFamily: "Helvetica-Bold" },
  tLabel: { fontFamily: "Helvetica-Bold", textAlign: "left" },
  tNum: { textAlign: "right" },
});

function Frame({ company, date, children }: { company: string; date: string; children: React.ReactNode }) {
  return (
    <Page size="LETTER" style={s.page} wrap>
      <View style={s.header} fixed>
        <Text style={s.headerTitle}>Company Analysis: {company}</Text>
        <Text style={s.headerDate}>Created: {date}</Text>
      </View>
      <View style={s.footer} fixed>
        <Text
          style={s.footerText}
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
        />
        <Text style={s.footerText}>Data provided by Yahoo Finance</Text>
      </View>
      {children}
    </Page>
  );
}

function PdfTable({ grid }: { grid: Grid }) {
  if (grid.empty) return <Text style={s.note}>{grid.note ?? "Data unavailable."}</Text>;
  const cols = grid.columns.length;
  const firstW = `${Math.min(34, 100 / cols + 14)}%`;
  const restW = `${(100 - parseFloat(firstW)) / (cols - 1)}%`;
  return (
    <View>
      <View style={s.tRow}>
        {grid.columns.map((c, i) => (
          <Text
            key={i}
            style={[s.tCell, s.tHeadCell, { width: i === 0 ? firstW : restW }, i === 0 ? s.tLabel : s.tNum]}
          >
            {c}
          </Text>
        ))}
      </View>
      {grid.rows.map((row, r) => (
        <View key={r} style={s.tRow}>
          {row.map((cell, i) => (
            <Text
              key={i}
              style={[s.tCell, { width: i === 0 ? firstW : restW }, i === 0 ? s.tLabel : s.tNum]}
            >
              {cell}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

type Pngs = Record<string, string | null>;

function Chart({ pngs, name, title }: { pngs: Pngs; name: string; title: string }) {
  const src = pngs[name];
  return (
    <View wrap={false}>
      <Text style={s.h3}>{title}</Text>
      {src ? <Image style={s.chart} src={src} /> : <Text style={s.note}>No data available.</Text>}
    </View>
  );
}

function buildDocument(report: Report, pngs: Pngs) {
  const { tables: t, profile, meta } = report;
  const company = meta.companySymbol;
  const date = meta.generatedAt;
  const profileRows: [string, string][] = [
    ["Company Name", profile.companyName],
    ["Company Symbol", profile.symbol],
    ["Market Cap", num(profile.mktCap)],
    ["Beta", profile.beta == null ? "—" : profile.beta.toFixed(2)],
    ["Currency", profile.currency || meta.currency || "—"],
    ["ISIN", profile.isin || "—"],
    ["Exchange", profile.exchange || "—"],
    ["Industry", profile.industry || "—"],
    ["Sector", profile.sector || "—"],
    ["Country", profile.country || "—"],
    ["No. Employees", num(profile.fullTimeEmployees)],
    ["CEO", profile.ceo || "—"],
    ["Website", profile.website || "—"],
    ["Next Earnings Date", profile.nextEarningsDate || "—"],
  ];

  return (
    <Document
      author="Fundamental Analysis"
      subject={`Fundamental Analysis for ${company}`}
      keywords={`fundamental, analysis, ${company}`}
    >
      <Frame company={company} date={date}>
        <Text style={s.h2}>Company Summary</Text>
        {profileRows.map(([k, v]) => (
          <View key={k} style={s.profileRow}>
            <Text style={s.profileKey}>{k}</Text>
            <Text style={s.profileVal}>{v}</Text>
          </View>
        ))}
        {profile.description ? <Text style={s.description}>{profile.description}</Text> : null}
      </Frame>

      <Frame company={company} date={date}>
        <Text style={s.h2}>Financial Statements</Text>
        <Text style={s.note}>Amounts in {meta.currency} (Millions)</Text>
        <Text style={s.h3}>Income Statement</Text>
        <PdfTable grid={t.incomeStatement} />
        <Text style={s.h3}>Common Size Income Statement</Text>
        <PdfTable grid={t.incomeStatementCS} />
        <Text style={s.h3}>Balance Sheet</Text>
        <PdfTable grid={t.balanceSheet} />
        <Text style={s.h3}>Common Size Balance Sheet</Text>
        <PdfTable grid={t.balanceSheetCS} />
        <Text style={s.h3}>Cash Flow Statement</Text>
        <PdfTable grid={t.cashFlow} />
      </Frame>

      <Frame company={company} date={date}>
        <Text style={s.h2}>Financial Summary — Risk &amp; Returns</Text>
        <Text style={s.h3}>Debt Ratios</Text>
        <PdfTable grid={t.debtRatios} />
        <Text style={s.h3}>Profit Ratios</Text>
        <PdfTable grid={t.profitRatios} />
        <Text style={s.h3}>Efficiency Ratios</Text>
        <PdfTable grid={t.efficiencyRatios} />
      </Frame>

      <Frame company={company} date={date}>
        <Text style={s.h2}>Financial Summary — Valuation</Text>
        <Text style={s.h3}>Market Ratios</Text>
        <PdfTable grid={t.marketRatios} />
        <Text style={s.h3}>Key Metrics</Text>
        <PdfTable grid={t.keyMetrics} />
      </Frame>

      <Frame company={company} date={date}>
        <Text style={s.h2}>Statement Graphs</Text>
        <Chart pngs={pngs} name="incomeStatement" title="Income Statement" />
        <Chart pngs={pngs} name="balanceSheet" title="Balance Sheet" />
        <Chart pngs={pngs} name="cashFlow" title="Cash Flow Statement" />
      </Frame>

      <Frame company={company} date={date}>
        <Text style={s.h2}>Common Size Graphs &amp; Equity Uses</Text>
        <Chart pngs={pngs} name="incomeStatementCS" title="Common Size Income Statement" />
        <Chart pngs={pngs} name="balanceSheetCS" title="Common Size Balance Sheet" />
        <Chart pngs={pngs} name="equityUses" title="Equity Uses" />
      </Frame>

      <Frame company={company} date={date}>
        <Text style={s.h2}>Dividends &amp; Analyst Consensus</Text>
        <Chart pngs={pngs} name="dividendHistory" title="Dividend History" />
        <Chart pngs={pngs} name="analystRecommendations" title="Analyst Recommendations" />
        <Text style={s.h3}>Analyst Price Targets</Text>
        <PdfTable grid={t.priceTargets} />
      </Frame>

      <Frame company={company} date={date}>
        <Text style={s.h2}>EPS: Estimate vs Actual</Text>
        <Chart pngs={pngs} name="earningsHistory" title="EPS: Estimate vs Actual (Recent Quarters)" />
        <Text style={s.h3}>Earnings Surprises Table</Text>
        <PdfTable grid={t.earningsHistory} />
      </Frame>

      <Frame company={company} date={date}>
        <Text style={s.h2}>Forward Estimates</Text>
        <Text style={s.h3}>Forward Earnings Estimate (EPS)</Text>
        <PdfTable grid={t.forwardEarnings} />
        <Text style={s.h3}>Forward Revenue Estimate</Text>
        <PdfTable grid={t.forwardRevenue} />
      </Frame>

      <Frame company={company} date={date}>
        <Text style={s.h2}>Ownership Breakdown</Text>
        <Text style={s.h3}>Major Holders Summary</Text>
        <PdfTable grid={t.majorHolders} />
        <Text style={s.h3}>Top 10 Institutional Holders</Text>
        <PdfTable grid={t.institutionalHolders} />
      </Frame>

      <Frame company={company} date={date}>
        <Text style={s.h2}>Insider Transactions</Text>
        <Text style={s.h3}>Insider Purchases Summary (Last 6 Months)</Text>
        <PdfTable grid={t.insiderPurchases} />
        <Text style={s.h3}>Recent Insider Transactions</Text>
        <PdfTable grid={t.insiderTransactions} />
      </Frame>
    </Document>
  );
}

function num(v: number | null): string {
  return v == null || !isFinite(v) ? "—" : v.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

const CHART_SIZES: Record<string, [number, number]> = {
  // wider/short for statement bars; default 800x400
};

export async function renderReportPdf(report: Report): Promise<Buffer> {
  // Pre-render every present chart to a PNG data URI.
  const pngs: Pngs = {};
  await Promise.all(
    Object.entries(report.charts).map(async ([name, option]) => {
      if (!option) {
        pngs[name] = null;
        return;
      }
      const [w, h] = CHART_SIZES[name] ?? [800, 400];
      pngs[name] = await chartToPng(option as ChartOption, w, h);
    }),
  );

  return renderToBuffer(buildDocument(report, pngs));
}
