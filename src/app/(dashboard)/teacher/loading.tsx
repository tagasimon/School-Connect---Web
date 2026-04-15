export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-7 w-72 bg-slate-800 rounded animate-pulse" />
        <div className="h-4 w-48 bg-slate-800 rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-3 animate-pulse">
            <div className="h-5 w-36 bg-slate-800 rounded" />
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="h-9 bg-slate-800 rounded" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
