export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-7 w-28 bg-slate-800 rounded animate-pulse" />
        <div className="h-4 w-64 bg-slate-800 rounded animate-pulse" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4 animate-pulse">
          <div className="h-5 w-40 bg-slate-800 rounded" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} className="h-10 bg-slate-800 rounded" />
            ))}
          </div>
          <div className="flex justify-end">
            <div className="h-9 w-28 bg-slate-800 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}
