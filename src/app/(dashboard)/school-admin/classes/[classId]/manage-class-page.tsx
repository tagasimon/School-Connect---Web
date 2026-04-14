'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateClassTeacher } from '@/lib/actions/classes'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ArrowLeft, Users, UserCheck } from 'lucide-react'
import Link from 'next/link'

export default function ManageClassPage({
  schoolId,
  classId,
  className,
  teacherId,
  teachers,
  students,
}: {
  schoolId: string
  classId: string
  className: string
  teacherId: string | null
  teachers: { id: string; full_name: string }[]
  students: { id: string; full_name: string }[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selectedTeacherId, setSelectedTeacherId] = useState(teacherId || '')
  const [success, setSuccess] = useState(false)

  const handleUpdateTeacher = () => {
    setSuccess(false)
    startTransition(async () => {
      const result = await updateClassTeacher(
        schoolId,
        classId,
        selectedTeacherId || null
      )

      if (result.success) {
        setSuccess(true)
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild className="border-slate-700 text-slate-400">
          <Link href="/school-admin/classes">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-white">{className}</h1>
          <p className="text-slate-400 text-sm mt-1">Manage class settings</p>
        </div>
      </div>

      {/* Assign Teacher */}
      <Card className="bg-slate-900 border-slate-800 max-w-2xl">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-amber-400" />
            Assigned Teacher
          </CardTitle>
          <CardDescription className="text-slate-400">
            Select a teacher to lead this class.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <select
            value={selectedTeacherId}
            onChange={(e) => setSelectedTeacherId(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="">No teacher assigned</option>
            {teachers.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.full_name}
              </option>
            ))}
          </select>

          {success && <p className="text-green-400 text-sm">Teacher updated successfully!</p>}

          <div className="flex justify-end">
            <Button
              onClick={handleUpdateTeacher}
              disabled={isPending}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold"
            >
              {isPending ? 'Updating...' : 'Update Teacher'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Students List */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-400" />
            Students ({students.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {students.length === 0 ? (
            <p className="text-slate-400 text-center py-8">No students enrolled in this class.</p>
          ) : (
            <div className="space-y-3">
              {students.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-slate-700 bg-slate-800/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-semibold">
                      {student.full_name?.charAt(0) || 'S'}
                    </div>
                    <p className="text-white font-medium">{student.full_name}</p>
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
