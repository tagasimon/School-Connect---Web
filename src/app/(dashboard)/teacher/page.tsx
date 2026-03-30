import { redirect } from 'next/navigation'
import { getSessionUid } from '@/lib/firebase/session'
import { getCurrentProfile, getClassesForTeacher, countCollection } from '@/lib/firebase/queries'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ClipboardList, BookOpen, ArrowRight } from 'lucide-react'

export default async function TeacherPage() {
  const uid = await getSessionUid()
  if (!uid) redirect('/login')

  const profile = await getCurrentProfile(uid)
  if (!profile?.school_id) redirect('/login')

  const classes = await getClassesForTeacher(profile.school_id, uid)

  const today = new Date().toISOString().split('T')[0]
  const todayAttendance = await countCollection('attendance', { marked_by: uid, date: today })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Good morning, {profile.full_name}</h1>
        <p className="text-slate-400 text-sm mt-1">
          {todayAttendance > 0
            ? `Attendance taken today (${todayAttendance} records)`
            : 'Attendance not taken yet today'}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-amber-400" />
              Take Attendance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {classes.length === 0 && (
              <p className="text-slate-400 text-sm">No classes assigned yet.</p>
            )}
            {classes.map((cls) => (
              <Link key={cls.id} href={`/teacher/attendance/${cls.id}`}>
                <Button
                  variant="outline"
                  className="w-full justify-between border-slate-700 text-slate-300 hover:border-amber-500 hover:text-amber-400"
                >
                  {cls.name}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-400" />
              Upload Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {classes.map((cls) => (
              <Link key={cls.id} href={`/teacher/results/${cls.id}`}>
                <Button
                  variant="outline"
                  className="w-full justify-between border-slate-700 text-slate-300 hover:border-blue-500 hover:text-blue-400"
                >
                  {cls.name}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
