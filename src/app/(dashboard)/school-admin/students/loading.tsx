export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-32 bg-slate-800 rounded animate-pulse" />
          <div className="h-4 w-44 bg-slate-800 rounded animate-pulse" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-28 bg-slate-800 rounded animate-pulse" />
          <div className="h-9 w-28 bg-slate-800 rounded animate-pulse" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 bg-slate-900 border border-slate-800 rounded-lg animate-pulse" />
        ))}
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4 animate-pulse">
        <div className="h-5 w-40 bg-slate-800 rounded" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 bg-slate-800 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  )
}
