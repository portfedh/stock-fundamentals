// Port of fetch.py _lookup_isin: query Business Insider's autocomplete directly
// with the ticker symbol (yfinance's built-in ISIN lookup misses most tickers).
export async function lookupIsin(symbol: string): Promise<string> {
  const sym = (symbol || "").toUpperCase();
  if (!sym) return "";
  const url =
    "https://markets.businessinsider.com/ajax/SearchController_Suggest" +
    `?max_results=25&query=${encodeURIComponent(sym)}`;
  try {
    const resp = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!resp.ok) return "";
    const text = await resp.text();
    const key = `"${sym}|`;
    const idx = text.indexOf(key);
    if (idx === -1) return "";
    const after = text.slice(idx + key.length);
    return after.split('"')[0].split("|")[0];
  } catch {
    return "";
  }
}
