'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { markAttendance } from '@/lib/actions/attendance'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Check, X } from 'lucide-react'
import Link from 'next/link'

interface Student {
  id: string
  full_name: string
  student_number: string | null
}

export default function AttendancePage({
  params,
  students,
  className,
}: {
  params: { classId: string }
  students: Student[]
  className: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent'>>(
    () => Object.fromEntries(students.map(s => [s.id, 'present']))
  )
  const [notes, setNotes] = useState<Record<string, string>>({})

  const handleSubmit = () => {
    startTransition(async () => {
      const data = students.map(student => ({
        studentId: student.id,
        status: attendance[student.id],
        notes: attendance[student.id] === 'absent' ? (notes[student.id] || 'No reason given') : undefined,
      }))
      await markAttendance(params.classId, data)
      router.push('/teacher')
    })
  }

  const absentCount = Object.values(attendance).filter(s => s === 'absent').length

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/teacher">
          <Button variant="outline" size="icon" className="border-slate-700 text-slate-400">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Take Attendance - {className}</h1>
          <p className="text-slate-400 text-sm mt-1">
            {new Date().toLocaleDateString('en-UG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <span>Students ({students.length})</span>
            {absentCount > 0 && (
              <span className="text-sm text-amber-400">{absentCount} absent</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {students.map((student) => (
              <div
                key={student.id}
                className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${
                  attendance[student.id] === 'present'
                    ? 'border-slate-700 bg-slate-800/50'
                    : 'border-amber-500/30 bg-amber-500/5'
                }`}
              >
                <div className="flex-1">
                  <p className="text-white font-medium">{student.full_name}</p>
                  {student.student_number && (
                    <p className="text-slate-400 text-sm">{student.student_number}</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant={attendance[student.id] === 'present' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setAttendance(prev => ({ ...prev, [student.id]: 'present' }))}
                    className={attendance[student.id] === 'present' 
                      ? 'bg-green-600 hover:bg-green-700 text-white' 
                      : 'border-slate-700 text-slate-400'}
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={attendance[student.id] === 'absent' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setAttendance(prev => ({ ...prev, [student.id]: 'absent' }))}
                    className={attendance[student.id] === 'absent' 
                      ? 'bg-amber-600 hover:bg-amber-700 text-white' 
                      : 'border-slate-700 text-slate-400'}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={isPending}
          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold px-8"
        >
          {isPending ? 'Saving...' : `Save Attendance (${students.length} students)`}
        </Button>
      </div>
    </div>
  )
}
