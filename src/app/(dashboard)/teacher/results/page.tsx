import { redirect } from 'next/navigation'
import { getSessionUid } from '@/lib/firebase/session'
import { getCurrentProfile, getClassesForTeacher } from '@/lib/firebase/queries'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { BookOpen, ChevronRight } from 'lucide-react'

export default async function TeacherResultsPage() {
  const uid = await getSessionUid()
  if (!uid) redirect('/login')

  const profile = await getCurrentProfile(uid)
  if (!profile?.school_id) redirect('/login')

  const classes = await getClassesForTeacher(profile.school_id, uid)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Results</h1>
        <p className="text-slate-400 text-sm mt-1">Select a class to view results</p>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-400" />
            Your Classes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {classes.length === 0 ? (
            <p className="text-slate-400">No classes assigned yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {classes.map((cls) => (
                <Link
                  key={cls.id}
                  href={`/teacher/results/${cls.id}/view`}
                  className="flex items-center justify-between p-4 rounded-lg border border-slate-700 bg-slate-800/50 hover:border-blue-500 transition-colors group"
                >
                  <div>
                    <p className="text-white font-medium">{cls.name}</p>
                    {cls.term_name && (
                      <p className="text-slate-400 text-sm">{cls.term_name}</p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition-colors" />
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
