/* eslint-disable jsx-a11y/alt-text */
// 11-page PDF mirroring pdf_report.py: header (date + company), footer
// (data source + page number), and the same 11 sections. Charts are pre-rendered
// to PNG (ECharts SSR -> resvg-js); tables are drawn with react-pdf primitives.
import React from "react";
import path from "path";
import {
  Document,
  Font,
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

// Embed the same Arimo the web UI and the chart rasterizer use, so PDF body
// text matches the charts glyph-for-glyph instead of relying on Helvetica
// metric compatibility. Files are traced for this route in next.config.ts.
const FONT_DIR = path.join(process.cwd(), "pdf/fonts");
Font.register({
  family: "Arimo",
  fonts: [
    { src: path.join(FONT_DIR, "Arimo-Regular.ttf"), fontWeight: 400 },
    { src: path.join(FONT_DIR, "Arimo-Bold.ttf"), fontWeight: 700 },
  ],
});
// Financial labels/tickers shouldn't hyphenate mid-word.
Font.registerHyphenationCallback((word) => [word]);

const C = {
  accent: "#003b73",
  accent2: "#01949a",
  accentSoft: "#eaf1f8",
  line: "#cdd6df",
  hairline: "#e3e8ee",
  surface2: "#fafcfe",
  muted: "#6b7785",
  fgSoft: "#33414f",
};

const s = StyleSheet.create({
  page: { paddingTop: 64, paddingBottom: 48, paddingHorizontal: 40, fontSize: 9, color: "#1a2330", fontFamily: "Arimo" },
  header: { position: "absolute", top: 18, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", borderBottomWidth: 1, borderBottomColor: C.hairline, paddingBottom: 5 },
  headerTitle: { fontSize: 11, fontWeight: 700, color: C.accent },
  headerDate: { fontSize: 7.5, color: C.muted, letterSpacing: 0.2 },
  footer: { position: "absolute", bottom: 20, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: C.hairline, paddingTop: 5 },
  footerText: { fontSize: 7.5, color: C.muted, letterSpacing: 0.2 },
  h2Row: { flexDirection: "row", alignItems: "center", marginBottom: 10, borderBottomWidth: 1, borderBottomColor: C.hairline, paddingBottom: 6 },
  h2Badge: { width: 16, height: 16, borderRadius: 8, backgroundColor: C.accent, marginRight: 6, alignItems: "center", justifyContent: "center" },
  h2BadgeText: { fontSize: 8, fontWeight: 700, color: "#ffffff" },
  h2: { fontSize: 13, fontWeight: 700, color: C.accent },
  h3: { flexDirection: "row", alignItems: "center", marginTop: 12, marginBottom: 5 },
  h3Tick: { width: 3, height: 9, borderRadius: 1.5, backgroundColor: C.accent2, marginRight: 5 },
  h3Text: { fontSize: 8, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.6 },
  note: { fontSize: 8.5, color: C.muted, marginTop: 4 },
  chart: { width: "100%", height: 176, objectFit: "contain", marginBottom: 6 },
  profileRow: { flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 0.5, borderBottomColor: C.hairline, paddingVertical: 3 },
  profileKey: { color: C.muted },
  profileVal: { fontWeight: 700 },
  // No lineHeight: any numeric value (even 1) makes react-pdf double-space
  // paragraphs with this font; the font's natural leading reads well.
  description: { marginTop: 12, color: C.fgSoft },
  // table: framed outer border, navy header band, hairline rules + zebra rows
  tFrame: { borderWidth: 1, borderColor: C.hairline },
  tRow: { flexDirection: "row" },
  tRowEven: { backgroundColor: C.surface2 },
  tCell: { paddingVertical: 3.5, paddingHorizontal: 4, fontSize: 7.5, borderBottomWidth: 0.5, borderBottomColor: C.hairline },
  tCellLast: { borderBottomWidth: 0 },
  tHeadCell: { backgroundColor: C.accent, color: "#ffffff", fontWeight: 700, fontSize: 6.5, textTransform: "uppercase", letterSpacing: 0.4, borderBottomWidth: 0 },
  tLabel: { fontWeight: 700, textAlign: "left" },
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
    <View style={s.tFrame}>
      {/* keep the header band and at least a couple of rows together */}
      <View style={s.tRow} minPresenceAhead={40}>
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
        <View key={r} style={[s.tRow, ...(r % 2 === 1 ? [s.tRowEven] : [])]}>
          {row.map((cell, i) => (
            <Text
              key={i}
              style={[
                s.tCell,
                { width: i === 0 ? firstW : restW },
                i === 0 ? s.tLabel : s.tNum,
                ...(r === grid.rows.length - 1 ? [s.tCellLast] : []),
              ]}
            >
              {cell}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

function SectionTitle({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <View style={s.h2Row}>
      <View style={s.h2Badge}>
        <Text style={s.h2BadgeText}>{n}</Text>
      </View>
      <Text style={s.h2}>{children}</Text>
    </View>
  );
}

function SubTitle({ children }: { children: React.ReactNode }) {
  return (
    <View style={s.h3} minPresenceAhead={60}>
      <View style={s.h3Tick} />
      <Text style={s.h3Text}>{children}</Text>
    </View>
  );
}

type Pngs = Record<string, string | null>;

function Chart({ pngs, name, title }: { pngs: Pngs; name: string; title: string }) {
  const src = pngs[name];
  return (
    <View wrap={false}>
      <SubTitle>{title}</SubTitle>
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
        <SectionTitle n={1}>Company Summary</SectionTitle>
        {profileRows.map(([k, v]) => (
          <View key={k} style={s.profileRow}>
            <Text style={s.profileKey}>{k}</Text>
            <Text style={s.profileVal}>{v}</Text>
          </View>
        ))}
        {profile.description ? <Text style={s.description}>{profile.description}</Text> : null}
      </Frame>

      <Frame company={company} date={date}>
        <SectionTitle n={2}>Financial Statements</SectionTitle>
        <Text style={s.note}>Amounts in {meta.currency} (Millions)</Text>
        <SubTitle>Income Statement</SubTitle>
        <PdfTable grid={t.incomeStatement} />
        <SubTitle>Common Size Income Statement</SubTitle>
        <PdfTable grid={t.incomeStatementCS} />
        <SubTitle>Balance Sheet</SubTitle>
        <PdfTable grid={t.balanceSheet} />
        <SubTitle>Common Size Balance Sheet</SubTitle>
        <PdfTable grid={t.balanceSheetCS} />
        <SubTitle>Cash Flow Statement</SubTitle>
        <PdfTable grid={t.cashFlow} />
      </Frame>

      <Frame company={company} date={date}>
        <SectionTitle n={3}>Financial Summary — Risk &amp; Returns</SectionTitle>
        <SubTitle>Debt Ratios</SubTitle>
        <PdfTable grid={t.debtRatios} />
        <SubTitle>Profit Ratios</SubTitle>
        <PdfTable grid={t.profitRatios} />
        <SubTitle>Efficiency Ratios</SubTitle>
        <PdfTable grid={t.efficiencyRatios} />
      </Frame>

      <Frame company={company} date={date}>
        <SectionTitle n={4}>Financial Summary — Valuation</SectionTitle>
        <SubTitle>Market Ratios</SubTitle>
        <PdfTable grid={t.marketRatios} />
        <SubTitle>Key Metrics</SubTitle>
        <PdfTable grid={t.keyMetrics} />
      </Frame>

      <Frame company={company} date={date}>
        <SectionTitle n={5}>Statement Graphs</SectionTitle>
        <Chart pngs={pngs} name="incomeStatement" title="Income Statement" />
        <Chart pngs={pngs} name="balanceSheet" title="Balance Sheet" />
        <Chart pngs={pngs} name="cashFlow" title="Cash Flow Statement" />
      </Frame>

      <Frame company={company} date={date}>
        <SectionTitle n={6}>Common Size Graphs &amp; Equity Uses</SectionTitle>
        <Chart pngs={pngs} name="incomeStatementCS" title="Common Size Income Statement" />
        <Chart pngs={pngs} name="balanceSheetCS" title="Common Size Balance Sheet" />
        <Chart pngs={pngs} name="equityUses" title="Equity Uses" />
      </Frame>

      <Frame company={company} date={date}>
        <SectionTitle n={7}>Dividends &amp; Analyst Consensus</SectionTitle>
        <Chart pngs={pngs} name="dividendHistory" title="Dividend History" />
        <Chart pngs={pngs} name="analystRecommendations" title="Analyst Recommendations" />
        <SubTitle>Analyst Price Targets</SubTitle>
        <PdfTable grid={t.priceTargets} />
      </Frame>

      <Frame company={company} date={date}>
        <SectionTitle n={8}>EPS: Estimate vs Actual</SectionTitle>
        <Chart pngs={pngs} name="earningsHistory" title="EPS: Estimate vs Actual (Recent Quarters)" />
        <SubTitle>Earnings Surprises Table</SubTitle>
        <PdfTable grid={t.earningsHistory} />
      </Frame>

      <Frame company={company} date={date}>
        <SectionTitle n={9}>Forward Estimates</SectionTitle>
        <SubTitle>Forward Earnings Estimate (EPS)</SubTitle>
        <PdfTable grid={t.forwardEarnings} />
        <SubTitle>Forward Revenue Estimate</SubTitle>
        <PdfTable grid={t.forwardRevenue} />
      </Frame>

      <Frame company={company} date={date}>
        <SectionTitle n={10}>Ownership Breakdown</SectionTitle>
        <SubTitle>Major Holders Summary</SubTitle>
        <PdfTable grid={t.majorHolders} />
        <SubTitle>Top 10 Institutional Holders</SubTitle>
        <PdfTable grid={t.institutionalHolders} />
      </Frame>

      <Frame company={company} date={date}>
        <SectionTitle n={11}>Insider Transactions</SectionTitle>
        <SubTitle>Insider Purchases Summary (Last 6 Months)</SubTitle>
        <PdfTable grid={t.insiderPurchases} />
        <SubTitle>Recent Insider Transactions</SubTitle>
        <PdfTable grid={t.insiderTransactions} />
      </Frame>
    </Document>
  );
}

function num(v: number | null): string {
  return v == null || !isFinite(v) ? "—" : v.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

const CHART_SIZES: Record<string, [number, number]> = {
  // wider/short for statement bars; default 1000x360 (wide aspect so three
  // 176pt-tall charts fit on one page without shrinking their width)
};
const DEFAULT_CHART_SIZE: [number, number] = [1000, 360];

export async function renderReportPdf(report: Report): Promise<Buffer> {
  // Pre-render every present chart to a PNG data URI.
  const pngs: Pngs = {};
  await Promise.all(
    Object.entries(report.charts).map(async ([name, option]) => {
      if (!option) {
        pngs[name] = null;
        return;
      }
      const [w, h] = CHART_SIZES[name] ?? DEFAULT_CHART_SIZE;
      pngs[name] = await chartToPng(option as ChartOption, w, h);
    }),
  );

  return renderToBuffer(buildDocument(report, pngs));
}
