// Render an ECharts option to a PNG data URI without a browser:
// ECharts headless SSR -> SVG string -> sharp rasterizes -> base64 PNG.
import * as echarts from "echarts";
import sharp from "sharp";
import { ChartOption } from "@/lib/charts";

export async function chartToPng(
  option: ChartOption,
  width = 800,
  height = 400,
): Promise<string> {
  const chart = echarts.init(null, null, { renderer: "svg", ssr: true, width, height });
  chart.setOption(option as echarts.EChartsOption);
  const svg = chart.renderToSVGString();
  chart.dispose();
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return `data:image/png;base64,${png.toString("base64")}`;
}
