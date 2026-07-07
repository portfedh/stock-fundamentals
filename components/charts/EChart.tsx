"use client";

import dynamic from "next/dynamic";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

// Options arrive as JSON from /api/report, so functions can't be part of them;
// attach the tooltip value formatter here on the client instead. Data is
// already rounded in lib/charts.ts — this only adds thousands separators.
function formatTooltipValue(v: unknown): string {
  return typeof v === "number" && isFinite(v)
    ? v.toLocaleString("en-US", { maximumFractionDigits: 2 })
    : "—";
}

export default function EChart({
  option,
  height = 340,
}: {
  option: Record<string, unknown>;
  height?: number;
}) {
  const tooltip = {
    ...((option.tooltip as Record<string, unknown>) ?? {}),
    valueFormatter: formatTooltipValue,
  };
  return (
    <ReactECharts
      option={{ ...option, tooltip }}
      style={{ height, width: "100%" }}
      notMerge
      lazyUpdate
      opts={{ renderer: "svg" }}
    />
  );
}
