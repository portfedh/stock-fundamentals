"use client";

import dynamic from "next/dynamic";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

export default function EChart({
  option,
  height = 340,
}: {
  option: Record<string, unknown>;
  height?: number;
}) {
  return (
    <ReactECharts
      option={option}
      style={{ height, width: "100%" }}
      notMerge
      lazyUpdate
      opts={{ renderer: "svg" }}
    />
  );
}
