import { Num } from "./types";

// Mirrors ratios.py _safe_div: NaN/None/0 denominator => null.
export function safeDiv(num: Num, den: Num): Num {
  if (num == null || den == null) return null;
  if (!isFinite(num) || !isFinite(den) || den === 0) return null;
  return num / den;
}

export function toNum(v: unknown): Num {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(v);
  return isFinite(n) ? n : null;
}

export function abs(v: Num): Num {
  return v == null ? null : Math.abs(v);
}

// Sum treating null as 0 (mirrors pandas .fillna(0) usages in ratios.py).
export function addOr0(...vals: Num[]): Num {
  let any = false;
  let total = 0;
  for (const v of vals) {
    if (v != null && isFinite(v)) {
      total += v;
      any = true;
    }
  }
  return any ? total : null;
}
