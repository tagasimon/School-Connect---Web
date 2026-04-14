import { redirect } from 'next/navigation'
import { getSessionUid } from '@/lib/firebase/session'
import { getCurrentProfile } from '@/lib/firebase/queries'
import { adminDb } from '@/lib/firebase/admin'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, Plus, Mail, Phone } from 'lucide-react'
import Link from 'next/link'

export default async function SchoolAdminTeachersPage() {
  const uid = await getSessionUid()
  if (!uid) redirect('/login')

  const profile = await getCurrentProfile(uid)
  if (!profile?.school_id) redirect('/login')

  const [teachersSnap, classesSnap] = await Promise.all([
    adminDb()
      .collection('users')
      .where('school_id', '==', profile.school_id)
      .where('role', '==', 'teacher')
      .get(),
    adminDb()
      .collection('classes')
      .where('school_id', '==', profile.school_id)
      .get(),
  ])

  const teachers = teachersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as any)
  const classes = classesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as any)

  // Map teachers to their classes
  const teacherClasses: Record<string, string[]> = {}
  classes.forEach(cls => {
    if (cls.teacher_id) {
      if (!teacherClasses[cls.teacher_id]) {
        teacherClasses[cls.teacher_id] = []
      }
      teacherClasses[cls.teacher_id].push(cls.name)
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Teachers</h1>
          <p className="text-slate-400 text-sm mt-1">Manage teaching staff</p>
        </div>
        <Button asChild className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold">
          <Link href="/school-admin/teachers/add">
            <Plus className="w-4 h-4 mr-2" />
            Add Teacher
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Total Teachers</CardTitle>
            <Users className="w-4 h-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">{teachers.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Classes Assigned</CardTitle>
            <Users className="w-4 h-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">
              {classes.filter(c => c.teacher_id).length} / {classes.length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Teachers List */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Teaching Staff</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {teachers.length === 0 ? (
              <p className="text-slate-400 text-center py-8">No teachers registered yet.</p>
            ) : (
              teachers.map((teacher) => (
                <div
                  key={teacher.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-slate-700 bg-slate-800/50"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-semibold">
                      {teacher.full_name?.charAt(0) || 'T'}
                    </div>
                    <div>
                      <p className="text-white font-medium">{teacher.full_name}</p>
                      <div className="flex items-center gap-4 text-sm text-slate-400">
                        {teacher.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {teacher.email}
                          </span>
                        )}
                        {teacher.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {teacher.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-300 text-sm">
                      {teacherClasses[teacher.id]?.length || 0} classes
                    </p>
                    {teacherClasses[teacher.id] && (
                      <p className="text-slate-500 text-xs">
                        {teacherClasses[teacher.id].join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
