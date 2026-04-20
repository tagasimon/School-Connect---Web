import { redirect } from 'next/navigation'
import { getSessionUid } from '@/lib/firebase/session'
import { getCurrentProfile, getClassesForTeacher } from '@/lib/firebase/queries'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { BookOpen, Upload, Eye } from 'lucide-react'

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
        <p className="text-slate-400 text-sm mt-1">Upload results or view past results by class</p>
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
                <div
                  key={cls.id}
                  className="p-4 rounded-lg border border-slate-700 bg-slate-800/50 space-y-3"
                >
                  <div>
                    <p className="text-white font-medium">{cls.name}</p>
                    {cls.term_name && (
                      <p className="text-slate-400 text-sm">{cls.term_name}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/teacher/results/${cls.id}`} className="flex-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-slate-600 text-slate-300 hover:border-blue-500 hover:text-blue-400 gap-1.5"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        Upload
                      </Button>
                    </Link>
                    <Link href={`/teacher/results/${cls.id}/view`} className="flex-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-slate-600 text-slate-300 hover:border-amber-500 hover:text-amber-400 gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View Results
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
