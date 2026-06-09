import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fundamental Analysis",
  description: "Dynamic company fundamental-analysis reports from Yahoo Finance.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
