import { useMemo, useState, type ReactNode } from "react";
import { EmptyState } from "./Card";

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  /** Provide to make the column sortable. */
  sortValue?: (row: T) => string | number;
  className?: string;
}

/** A simple sortable table. Wide tables scroll sideways inside their own box. */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  emptyTitle = "Nothing here yet",
  emptyBody,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyTitle?: string;
  emptyBody?: string;
}) {
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);

  const sorted = useMemo(() => {
    const col = columns.find((c) => c.key === sort?.key);
    if (!sort || !col?.sortValue) return rows;
    const value = col.sortValue;
    return [...rows].sort((a, b) => {
      const av = value(a);
      const bv = value(b);
      return (av < bv ? -1 : av > bv ? 1 : 0) * sort.dir;
    });
  }, [rows, columns, sort]);

  if (rows.length === 0) return <EmptyState title={emptyTitle} body={emptyBody} />;

  return (
    <div className="overflow-x-auto rounded-xl border border-(--color-line) bg-(--color-card)">
      <table className="w-full min-w-[560px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-(--color-line)">
            {columns.map((col) => {
              const active = sort?.key === col.key;
              return (
                <th key={col.key} scope="col" className={`px-4 py-3 text-xs font-medium uppercase tracking-[0.08em] text-(--color-mist) ${col.className ?? ""}`}>
                  {col.sortValue ? (
                    <button type="button" onClick={() => setSort({ key: col.key, dir: active && sort?.dir === 1 ? -1 : 1 })} className="inline-flex min-h-11 items-center gap-1 uppercase tracking-[0.08em] hover:text-(--color-ink)">
                      {col.header}
                      <span aria-hidden="true">{active ? (sort?.dir === 1 ? "▲" : "▼") : ""}</span>
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`border-b border-(--color-line) last:border-b-0 ${onRowClick ? "cursor-pointer transition-colors hover:bg-(--color-cloud)" : ""}`}
            >
              {columns.map((col) => (
                <td key={col.key} className={`px-4 py-3 text-(--color-ink-soft) ${col.className ?? ""}`}>
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
