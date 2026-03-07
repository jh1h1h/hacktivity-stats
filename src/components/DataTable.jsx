// src/components/DataTable.jsx

export default function DataTable({ columns = [], rows = [], isLoading = false }) {
  if (isLoading) {
    return (
      <div className="card-border rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border flex gap-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-3 bg-muted/60 rounded animate-pulse" style={{ width: `${60 + i * 15}px` }} />
          ))}
        </div>
        {[...Array(6)].map((_, i) => (
          <div key={i} className="px-4 py-3 border-b border-border/50 flex gap-2 items-center">
            {[...Array(4)].map((_, j) => (
              <div key={j} className="h-2.5 bg-muted/40 rounded animate-pulse" style={{ width: `${50 + j * 20}px`, animationDelay: `${i * 50}ms` }} />
            ))}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="card-border rounded-xl border border-border overflow-hidden animate-fade-in">
      <table className="w-full text-sm">
        <thead className="border-b border-border">
          <tr>
            {columns.map(col => (
              <th key={col.key} className="px-4 py-3 text-left text-xs font-mono text-dim uppercase tracking-widest whitespace-nowrap">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-dim font-mono text-xs">
                NO DATA
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr
                key={i}
                className="border-b border-border/40 hover:bg-muted/20 transition-colors group"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                {columns.map(col => (
                  <td key={col.key} className="px-4 py-3 font-mono text-xs text-text group-hover:text-bright transition-colors">
                    {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
