import { NextRequest, NextResponse } from "next/server";
import { buildReport } from "@/lib/report";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ticker = (searchParams.get("ticker") || "").trim();
  const years = clampYears(searchParams.get("years"));

  if (!ticker) {
    return NextResponse.json({ error: "Missing ticker parameter." }, { status: 400 });
  }

  try {
    const report = await buildReport(ticker, years);
    if (!report.meta.years) {
      return NextResponse.json(
        { error: `No financial data found for "${ticker.toUpperCase()}".` },
        { status: 404 },
      );
    }
    return NextResponse.json(report);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json(
      { error: `Could not build report for "${ticker.toUpperCase()}": ${msg}` },
      { status: 502 },
    );
  }
}

function clampYears(raw: string | null): number {
  const n = Number(raw);
  if (!isFinite(n) || n <= 0) return 5;
  return Math.min(Math.max(Math.floor(n), 1), 10);
}
