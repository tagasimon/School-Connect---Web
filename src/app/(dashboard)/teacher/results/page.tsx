import { redirect } from 'next/navigation'
import { getSessionUid } from '@/lib/firebase/session'
import { getCurrentProfile, getClassesForTeacher } from '@/lib/firebase/queries'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { BookOpen, ArrowRight } from 'lucide-react'

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
        <p className="text-slate-400 text-sm mt-1">Select a class to upload results</p>
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
            <div className="space-y-3">
              {classes.map((cls) => (
                <Link key={cls.id} href={`/teacher/results/${cls.id}`}>
                  <Button
                    variant="outline"
                    className="w-full justify-between border-slate-700 text-slate-300 hover:border-blue-500 hover:text-blue-400"
                  >
                    {cls.name}
                    {cls.term_name && (
                      <span className="text-xs text-slate-500">{cls.term_name}</span>
                    )}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
