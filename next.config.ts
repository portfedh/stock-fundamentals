import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep native / heavy libs out of the bundle; load them at runtime on the server.
  serverExternalPackages: ["@resvg/resvg-js", "echarts", "@react-pdf/renderer", "yahoo-finance2"],
  // chartToPng reads the bundled TTFs from disk at runtime; ensure they ship with
  // the serverless function for the PDF route (Next won't trace non-imported assets).
  outputFileTracingIncludes: {
    "/api/report/pdf": ["./pdf/fonts/**/*"],
  },
};

export default nextConfig;
