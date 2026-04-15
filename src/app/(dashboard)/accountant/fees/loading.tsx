export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-7 w-40 bg-slate-800 rounded animate-pulse" />
        <div className="h-4 w-60 bg-slate-800 rounded animate-pulse" />
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4 animate-pulse">
        <div className="h-5 w-32 bg-slate-800 rounded" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-14 bg-slate-800 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  )
}
