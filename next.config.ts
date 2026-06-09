import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep native / heavy libs out of the bundle; load them at runtime on the server.
  serverExternalPackages: ["sharp", "echarts", "@react-pdf/renderer", "yahoo-finance2"],
};

export default nextConfig;
