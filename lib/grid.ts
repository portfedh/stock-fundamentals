// A simple rectangular table model shared by the web page (HTML) and the PDF.
// columns[0] is the corner/row-label header; each row's cell[0] is its label.
export interface Grid {
  columns: string[];
  rows: string[][];
  empty?: boolean;
  note?: string; // shown when empty (mirrors the PDF "… unavailable" text)
}

export function emptyGrid(note: string): Grid {
  return { columns: [], rows: [], empty: true, note };
}
