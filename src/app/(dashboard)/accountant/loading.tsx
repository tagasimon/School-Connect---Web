export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-7 w-48 bg-slate-800 rounded animate-pulse" />
        <div className="h-4 w-64 bg-slate-800 rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 bg-slate-900 border border-slate-800 rounded-lg animate-pulse" />
        ))}
      </div>
    </div>
  )
}
