import { redirect } from 'next/navigation'
import { getSessionUid } from '@/lib/firebase/session'
import { getCurrentProfile } from '@/lib/firebase/queries'
import { adminDb } from '@/lib/firebase/admin'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, BookOpen, Users } from 'lucide-react'
import Link from 'next/link'

export default async function SchoolAdminClassesPage() {
  const uid = await getSessionUid()
  if (!uid) redirect('/login')

  const profile = await getCurrentProfile(uid)
  if (!profile?.school_id) redirect('/login')

  const [classesSnap, teachersSnap, termsSnap, studentsSnap] = await Promise.all([
    adminDb()
      .collection('classes')
      .where('school_id', '==', profile.school_id)
      .get(),
    adminDb()
      .collection('users')
      .where('school_id', '==', profile.school_id)
      .where('role', '==', 'teacher')
      .get(),
    adminDb()
      .collection('terms')
      .where('school_id', '==', profile.school_id)
      .get(),
    adminDb()
      .collection('students')
      .where('school_id', '==', profile.school_id)
      .get(),
  ])

  const classes = classesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as any)
  const teachers = teachersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as any)
  const terms = termsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as any)
  const students = studentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as any)

  const teacherMap = new Map(teachers.map(t => [t.id, t.full_name]))
  const termMap = new Map(terms.map(t => [t.id, t.name]))
  const currentTerm = terms.find(t => t.is_current)

  const studentsByClass: Record<string, number> = {}
  classes.forEach(cls => {
    studentsByClass[cls.id] = students.filter(s => s.class_id === cls.id).length
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Classes</h1>
          <p className="text-slate-400 text-sm mt-1">Manage class assignments</p>
        </div>
        <Button asChild className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold">
          <Link href="/school-admin/classes/create">
            <Plus className="w-4 h-4 mr-2" />
            Create Class
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Total Classes</CardTitle>
            <BookOpen className="w-4 h-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">{classes.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Current Term</CardTitle>
            <Users className="w-4 h-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">
              {currentTerm?.name || 'No active term'} {currentTerm?.year || ''}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Classes List */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">All Classes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {classes.length === 0 ? (
              <p className="text-slate-400 text-center py-8">No classes created yet.</p>
            ) : (
              classes.map((cls) => (
                <div
                  key={cls.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-slate-700 bg-slate-800/50"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-white font-semibold text-lg">{cls.name}</p>
                      <div className="flex items-center gap-4 text-sm text-slate-400">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {studentsByClass[cls.id] || 0} students
                        </span>
                        {cls.teacher_id && (
                          <span>• Teacher: {teacherMap.get(cls.teacher_id) || 'Unknown'}</span>
                        )}
                        <span>• {termMap.get(cls.term_id) || 'Unknown term'}</span>
                      </div>
                    </div>
                  </div>
                  <Button asChild variant="outline" size="sm" className="border-slate-700 text-slate-400">
                    <Link href={`/school-admin/classes/${cls.id}`}>
                      Manage
                    </Link>
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
