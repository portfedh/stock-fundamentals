// Render an ECharts option to a PNG data URI without a browser:
// ECharts headless SSR -> SVG string -> resvg-js rasterizes -> base64 PNG.
// resvg-js draws glyphs from explicit bundled fonts (loadSystemFonts: false),
// so axis/legend/title text renders reliably everywhere instead of as the
// ".notdef" tofu boxes that sharp/librsvg produced from unresolved system fonts.
import * as echarts from "echarts";
import { Resvg } from "@resvg/resvg-js";
import { readFileSync } from "fs";
import path from "path";
import { ChartOption } from "@/lib/charts";

const FONT_DIR = path.join(process.cwd(), "pdf/fonts");
// Arimo is metric-compatible with Arial/Helvetica, so chart text matches the
// PDF body (which uses react-pdf's built-in Helvetica).
const FONT_FILES = ["Arimo-Regular.ttf", "Arimo-Bold.ttf"].map((f) =>
  path.join(FONT_DIR, f),
);
const FONT_FAMILY = "Arimo";

export async function chartToPng(
  option: ChartOption,
  width = 800,
  height = 400,
): Promise<string> {
  const chart = echarts.init(null, null, { renderer: "svg", ssr: true, width, height });
  chart.setOption(option as echarts.EChartsOption);
  const svg = chart.renderToSVGString();
  chart.dispose();
  const resvg = new Resvg(svg, {
    font: {
      fontFiles: FONT_FILES,
      loadSystemFonts: false, // deterministic: never fall back to the broken system path
      defaultFontFamily: FONT_FAMILY,
      sansSerifFamily: FONT_FAMILY, // the SVG declares font-family: sans-serif
    },
    fitTo: { mode: "width", value: width * 2 }, // 2x raster for crisper PDF text
  });
  const png = resvg.render().asPng();
  return `data:image/png;base64,${Buffer.from(png).toString("base64")}`;
}
