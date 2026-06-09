import { Grid } from "@/lib/grid";

export default function DataTable({ grid }: { grid: Grid }) {
  if (grid.empty) {
    return <p className="muted">{grid.note ?? "Data unavailable."}</p>;
  }
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {grid.columns.map((c, i) => (
              <th key={i} className={i === 0 ? "rowhead" : "num"}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.rows.map((row, r) => (
            <tr key={r}>
              {row.map((cell, c) => (
                <td key={c} className={c === 0 ? "rowhead" : "num"}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
