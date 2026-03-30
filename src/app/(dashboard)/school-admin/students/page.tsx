import { redirect } from 'next/navigation'
import { getSessionUid } from '@/lib/firebase/session'
import { getCurrentProfile } from '@/lib/firebase/queries'
import { adminDb } from '@/lib/firebase/admin'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, Upload, Plus, GraduationCap } from 'lucide-react'

export default async function SchoolAdminStudentsPage() {
  const uid = await getSessionUid()
  if (!uid) redirect('/login')

  const profile = await getCurrentProfile(uid)
  if (!profile?.school_id) redirect('/login')

  const [studentsSnap, classesSnap] = await Promise.all([
    adminDb()
      .collection('students')
      .where('school_id', '==', profile.school_id)
      .get(),
    adminDb()
      .collection('classes')
      .where('school_id', '==', profile.school_id)
      .get(),
  ])

  const students = studentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as any)
  const classes = classesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as any)

  const classMap = new Map(classes.map(c => [c.id, c.name]))
  const studentsByClass: Record<string, number> = {}
  classes.forEach(c => {
    studentsByClass[c.id] = students.filter(s => s.class_id === c.id).length
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Students</h1>
          <p className="text-slate-400 text-sm mt-1">Manage student records</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-slate-700 text-slate-400">
            <Upload className="w-4 h-4 mr-2" />
            Import CSV
          </Button>
          <Button className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold">
            <Plus className="w-4 h-4 mr-2" />
            Add Student
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Total Students</CardTitle>
            <Users className="w-4 h-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">{students.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Active</CardTitle>
            <GraduationCap className="w-4 h-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">
              {students.filter(s => s.status === 'active').length}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Classes</CardTitle>
            <Users className="w-4 h-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">{classes.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Students by Class */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Students by Class</CardTitle>
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
                  <div>
                    <p className="text-white font-medium">{cls.name}</p>
                    <p className="text-slate-400 text-sm">
                      {studentsByClass[cls.id] || 0} students
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-slate-700 text-slate-400"
                  >
                    View Students
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Students List */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">All Students</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 text-sm text-slate-400 font-medium">Name</th>
                  <th className="text-left py-3 px-4 text-sm text-slate-400 font-medium">Class</th>
                  <th className="text-left py-3 px-4 text-sm text-slate-400 font-medium">Student No.</th>
                  <th className="text-left py-3 px-4 text-sm text-slate-400 font-medium">Gender</th>
                  <th className="text-center py-3 px-4 text-sm text-slate-400 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {students.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No students registered yet.
                    </td>
                  </tr>
                ) : (
                  students.map((student) => (
                    <tr key={student.id} className="border-b border-slate-800">
                      <td className="py-3 px-4 text-white">{student.full_name}</td>
                      <td className="py-3 px-4 text-slate-300">
                        {classMap.get(student.class_id) || 'Unknown'}
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {student.student_number || '-'}
                      </td>
                      <td className="py-3 px-4 text-slate-300 capitalize">
                        {student.gender || '-'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            student.status === 'active'
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {student.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
