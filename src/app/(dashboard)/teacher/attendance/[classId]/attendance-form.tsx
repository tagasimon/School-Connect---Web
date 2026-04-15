'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { markAttendance } from '@/lib/actions/attendance'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Check, X, AlertCircle, CheckCircle, Search } from 'lucide-react'
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
  const [isPending, setIsPending] = useState(false)
  const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent'>>(
    () => Object.fromEntries(students.map(s => [s.id, 'present']))
  )
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [search, setSearch] = useState('')

  const handleSubmit = async () => {
    if (isPending) return
    setIsPending(true)
    setError(null)
    setSuccess(false)
    try {
      const data = students.map(student => ({
        studentId: student.id,
        status: attendance[student.id],
        notes: attendance[student.id] === 'absent' ? (notes[student.id] || 'No reason given') : undefined,
      }))
      const result = await markAttendance(params.classId, data)
      if (result.success) {
        setSuccess(true)
        setTimeout(() => router.push('/teacher'), 1500)
      } else {
        setError(result.error || 'Failed to save attendance')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.')
    } finally {
      setIsPending(false)
    }
  }

  const absentCount = Object.values(attendance).filter(s => s === 'absent').length

  const filteredStudents = students.filter(s =>
    s.full_name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header row — back button, title, save button */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/teacher">
            <Button variant="outline" size="icon" className="border-slate-700 text-slate-400 shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Take Attendance — {className}</h1>
            <p className="text-slate-400 text-sm mt-1">
              {new Date().toLocaleDateString('en-UG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>
        <Button
          onClick={handleSubmit}
          disabled={isPending}
          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold px-8 shrink-0"
        >
          {isPending ? 'Saving...' : `Save Attendance (${students.length})`}
        </Button>
      </div>

      {error && (
        <Card className="bg-slate-900 border-red-500/30 shrink-0">
          <CardContent className="py-4 flex items-center gap-2 text-red-400">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </CardContent>
        </Card>
      )}

      {success && (
        <Card className="bg-slate-900 border-green-500/30 shrink-0">
          <CardContent className="py-4 flex items-center gap-2 text-green-400">
            <CheckCircle className="w-5 h-5 shrink-0" />
            <span>Attendance saved successfully! Redirecting...</span>
          </CardContent>
        </Card>
      )}

      {/* Student list — fills remaining height and scrolls independently */}
      <Card className="bg-slate-900 border-slate-800 flex-1 min-h-0 flex flex-col">
        <CardHeader className="shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white">
              Students ({students.length})
            </CardTitle>
            {absentCount > 0 && (
              <span className="text-sm text-amber-400">{absentCount} absent</span>
            )}
          </div>
          <div className="relative mt-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <Input
              placeholder="Search students..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
            />
          </div>
        </CardHeader>
        <CardContent className="overflow-y-auto flex-1">
          <div className="space-y-3">
            {filteredStudents.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-4">No students match your search.</p>
            ) : (
              filteredStudents.map((student) => (
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
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
