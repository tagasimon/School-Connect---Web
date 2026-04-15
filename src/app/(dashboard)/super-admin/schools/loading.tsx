export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-24 bg-slate-800 rounded animate-pulse" />
          <div className="h-4 w-52 bg-slate-800 rounded animate-pulse" />
        </div>
        <div className="h-9 w-28 bg-slate-800 rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 bg-slate-900 border border-slate-800 rounded-lg animate-pulse" />
        ))}
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 animate-pulse">
        <div className="h-10 bg-slate-800 rounded" />
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-3 animate-pulse">
        <div className="h-5 w-28 bg-slate-800 rounded" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 bg-slate-800 rounded-lg" />
        ))}
      </div>
    </div>
  )
}
