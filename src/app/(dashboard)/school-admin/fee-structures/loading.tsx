export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-40 bg-slate-800 rounded animate-pulse" />
          <div className="h-4 w-44 bg-slate-800 rounded animate-pulse" />
        </div>
        <div className="h-9 w-40 bg-slate-800 rounded animate-pulse" />
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-3 animate-pulse">
        <div className="h-5 w-36 bg-slate-800 rounded" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 bg-slate-800 rounded-lg" />
        ))}
      </div>
    </div>
  )
}
