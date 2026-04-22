export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-32 bg-slate-800 rounded animate-pulse" />
      <div className="grid grid-cols-2 gap-4">
        <div className="h-24 bg-slate-800 rounded-lg animate-pulse" />
        <div className="h-24 bg-slate-800 rounded-lg animate-pulse" />
      </div>
      <div className="h-64 bg-slate-800 rounded-lg animate-pulse" />
    </div>
  )
}
