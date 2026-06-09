import { Num } from "./types";

export const DASH = "—";

function isBad(v: Num): boolean {
  return v == null || !isFinite(v);
}

// Fixed-decimal with thousands separators, "—" for missing (mirrors tables.py _fmt).
export function nf(v: Num, digits = 0): string {
  if (isBad(v)) return DASH;
  return (v as number).toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

// Signed fixed-decimal (e.g. "+1.23"), for earnings surprises.
export function nfSigned(v: Num, digits = 2): string {
  if (isBad(v)) return DASH;
  const s = nf(Math.abs(v as number), digits);
  return (v as number) < 0 ? `-${s}` : `+${s}`;
}

// Value already a fraction (0.12) -> "12.0%".
export function pct(v: Num, digits = 1): string {
  if (isBad(v)) return DASH;
  return `${nf((v as number) * 100, digits)}%`;
}

// Signed percent from fraction: 0.05 -> "+5.0%".
export function pctSigned(v: Num, digits = 1): string {
  if (isBad(v)) return DASH;
  const s = nf(Math.abs((v as number) * 100), digits);
  return (v as number) < 0 ? `-${s}%` : `+${s}%`;
}

// Value already a percent number (e.g. 12.3) -> "12.3%".
export function pctRaw(v: Num, digits = 1): string {
  if (isBad(v)) return DASH;
  return `${nf(v, digits)}%`;
}

// Billions, e.g. 109023928020 -> "$109.02B".
export function billions(v: Num, digits = 2): string {
  if (isBad(v)) return DASH;
  return `$${nf((v as number) / 1e9, digits)}B`;
}
