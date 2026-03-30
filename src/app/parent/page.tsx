import { logout } from '@/lib/actions/auth'

export default function ParentPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="max-w-md w-full space-y-6 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-500 text-slate-950 font-bold text-2xl">
          SC
        </div>
        <h1 className="text-2xl font-bold text-white">Parent Portal</h1>
        <p className="text-slate-400">
          Parents should use the <strong>SchoolConnect mobile app</strong> to access student information.
        </p>
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Download the app from the Google Play Store to view:
          </p>
          <ul className="text-left text-sm text-slate-400 space-y-2 inline-block">
            <li>• Attendance records</li>
            <li>• Exam results</li>
            <li>• Fee statements</li>
            <li>• School announcements</li>
          </ul>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white hover:bg-slate-700 transition-colors"
          >
            Sign Out
          </button>
        </form>
      </div>
    </div>
  )
}
