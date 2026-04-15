export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-44 bg-slate-800 rounded animate-pulse" />
          <div className="h-4 w-56 bg-slate-800 rounded animate-pulse" />
        </div>
        <div className="h-9 w-40 bg-slate-800 rounded animate-pulse" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-3 animate-pulse">
            <div className="flex items-start justify-between">
              <div className="h-5 w-48 bg-slate-800 rounded" />
              <div className="h-4 w-24 bg-slate-800 rounded" />
            </div>
            <div className="h-4 w-20 bg-slate-800 rounded" />
            <div className="h-12 bg-slate-800 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
