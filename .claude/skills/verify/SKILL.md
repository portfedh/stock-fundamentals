---
name: verify
description: Build, launch, and drive the stock-fundamentals app to verify changes end-to-end.
---

# Verifying stock-fundamentals

## Build & launch
- `npm run lint` / `npm run build` (Next.js 16, Turbopack). Two pre-existing lint warnings in `pdf/chartToPng.ts` are known noise.
- Dev server: `npm run dev -- --port <port>` in background; up in ~1s. UI at `http://localhost:<port>/`.

## Surfaces
- Homepage `/` — client component (`app/page.tsx`) but the initial (hero/empty) state is in the SSR HTML, so `curl` can verify it.
- `GET /api/report?ticker=AAPL&years=4` — JSON report. Junk ticker (e.g. `ZZZZ123`) → 404 `{"error":...}`; use it to trigger the UI error state.
- `GET /api/report/pdf?ticker=AAPL&years=4` — streams `application/pdf` (~500 KB); first render takes several seconds.

## Driving the UI (no Playwright in repo)
- System Chrome exists at `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`.
- Static screenshot: `"…/Google Chrome" --headless --disable-gpu --screenshot=out.png --window-size=1280,900 <url>`.
- Interactive states: `npm install puppeteer-core` in the scratchpad and launch with `executablePath` pointing at system Chrome.
- Gotcha: to fill the ticker input under React 19, don't rely on triple-click or Meta+A (unreliable headless). Set the value via the native setter + `input` event:
  `Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, v); el.dispatchEvent(new Event("input", {bubbles:true}))`.

## Flows worth driving
1. Empty state: hero + chips + feature cards; topbar shows brand only.
2. Submit junk ticker → error banner, form moves to topbar for retry.
3. Submit AAPL → spinner/skeletons, then report; "Download PDF" button appears.
4. Example-ticker chip click → fills input and fetches.
5. Whitespace-only submit → no-op (hero stays).
6. Narrow viewport (~420px) → hero form wraps, feature grid 1-col.
