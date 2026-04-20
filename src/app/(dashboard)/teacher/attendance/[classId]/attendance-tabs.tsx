'use client'

import { useState, useTransition, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Check, X, AlertCircle, CheckCircle, Search, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { markAttendance, getAttendanceForMonth } from '@/lib/actions/attendance'

interface Student {
  id: string
  full_name: string
  student_number: string | null
}

interface MonthStudent {
  student_id: string
  full_name: string
  student_number: string | null
  days: Record<number, 'present' | 'absent'>
}

interface Props {
  classId: string
  className: string
  students: Student[]
}

function today() {
  return new Date().toISOString().split('T')[0]
}

// ─── Mark Attendance Tab ──────────────────────────────────────────────────────

function MarkAttendanceTab({ classId, students }: { classId: string; students: Student[] }) {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent'>>(
    () => Object.fromEntries(students.map(s => [s.id, 'present']))
  )
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [search, setSearch] = useState('')

  const absentCount = Object.values(attendance).filter(s => s === 'absent').length
  const filteredStudents = students.filter(s =>
    s.full_name.toLowerCase().includes(search.toLowerCase())
  )

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
      const result = await markAttendance(classId, data)
      if (result.success) {
        setSuccess(true)
        setTimeout(() => router.push('/teacher/attendance'), 1500)
      } else {
        setError(result.error || 'Failed to save attendance')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-slate-400 text-sm">
          {new Date().toLocaleDateString('en-UG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
        <Button
          onClick={handleSubmit}
          disabled={isPending}
          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold px-8 shrink-0"
        >
          {isPending ? 'Saving...' : `Save Attendance (${students.length})`}
        </Button>
      </div>

      {error && (
        <Card className="bg-slate-900 border-red-500/30">
          <CardContent className="py-4 flex items-center gap-2 text-red-400">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </CardContent>
        </Card>
      )}

      {success && (
        <Card className="bg-slate-900 border-green-500/30">
          <CardContent className="py-4 flex items-center gap-2 text-green-400">
            <CheckCircle className="w-5 h-5 shrink-0" />
            <span>Attendance saved successfully! Redirecting...</span>
          </CardContent>
        </Card>
      )}

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white">Students ({students.length})</CardTitle>
            {absentCount > 0 && <span className="text-sm text-amber-400">{absentCount} absent</span>}
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
        <CardContent>
          <div className="space-y-3">
            {filteredStudents.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-4">No students match your search.</p>
            ) : (
              filteredStudents.map(student => (
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

// ─── View History Tab ─────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]
const DAY_ABBR = ['Su','Mo','Tu','We','Th','Fr','Sa']

function ViewHistoryTab({ classId }: { classId: string }) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1) // 1-based
  const [data, setData] = useState<{ students: MonthStudent[]; daysInMonth: number } | null>(null)
  const [isPending, startTransition] = useTransition()

  // Auto-load on mount and whenever year/month changes
  function load(y: number, m: number) {
    startTransition(async () => {
      const result = await getAttendanceForMonth(classId, y, m)
      setData(result)
    })
  }

  // Load current month on first render
  useState(() => { load(year, month) })

  function prevMonth() {
    const newMonth = month === 1 ? 12 : month - 1
    const newYear = month === 1 ? year - 1 : year
    setMonth(newMonth); setYear(newYear); setData(null); load(newYear, newMonth)
  }

  function nextMonth() {
    const newMonth = month === 12 ? 1 : month + 1
    const newYear = month === 12 ? year + 1 : year
    setMonth(newMonth); setYear(newYear); setData(null); load(newYear, newMonth)
  }

  const isCurrentOrFuture = year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth() + 1)

  // Build day metadata: dayOfWeek for each day in month
  function dayOfWeek(day: number) {
    return new Date(year, month - 1, day).getDay() // 0=Sun
  }
  const isWeekend = (day: number) => { const d = dayOfWeek(day); return d === 0 || d === 6 }

  return (
    <div className="space-y-4">
      {/* Month navigator */}
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="pt-6 pb-5">
          <div className="flex items-center justify-between gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={prevMonth}
              disabled={isPending}
              className="border-slate-700 text-slate-400 hover:text-white shrink-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="text-center">
              <p className="text-white font-semibold text-lg">{MONTH_NAMES[month - 1]} {year}</p>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={nextMonth}
              disabled={isPending || isCurrentOrFuture}
              className="border-slate-700 text-slate-400 hover:text-white shrink-0 disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          {/* Legend */}
          <div className="flex items-center justify-center gap-4 mt-4 text-xs text-slate-400">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-green-500 inline-block" />Present</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-500 inline-block" />Absent</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-slate-700 inline-block" />Not marked</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-slate-800 border border-slate-700 inline-block opacity-50" />Weekend</span>
          </div>
        </CardContent>
      </Card>

      {/* Heatmap table */}
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-0 overflow-x-auto">
          {isPending || !data ? (
            <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Loading attendance…</span>
            </div>
          ) : data.students.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-12">No active students in this class.</p>
          ) : (
            <table className="w-full text-xs border-separate border-spacing-0">
              <thead>
                {/* Day number row */}
                <tr>
                  <th className="sticky left-0 z-10 bg-slate-900 text-left px-4 py-3 text-slate-400 font-medium min-w-[160px] border-b border-slate-800">
                    Student
                  </th>
                  {Array.from({ length: data.daysInMonth }, (_, i) => i + 1).map(day => (
                    <th
                      key={day}
                      className={`py-2 px-0.5 text-center border-b border-slate-800 font-medium w-7 ${
                        isWeekend(day) ? 'text-slate-600' : 'text-slate-400'
                      }`}
                    >
                      <div>{day}</div>
                      <div className="text-slate-600 font-normal">{DAY_ABBR[dayOfWeek(day)]}</div>
                    </th>
                  ))}
                  <th className="px-3 py-3 text-center text-slate-400 font-medium border-b border-slate-800 whitespace-nowrap">Present</th>
                  <th className="px-3 py-3 text-center text-slate-400 font-medium border-b border-slate-800 whitespace-nowrap">Absent</th>
                  <th className="px-3 py-3 text-center text-slate-400 font-medium border-b border-slate-800 whitespace-nowrap">Rate</th>
                </tr>
              </thead>
              <tbody>
                {data.students.map((student, si) => {
                  const presentDays = Object.values(student.days).filter(s => s === 'present').length
                  const absentDays = Object.values(student.days).filter(s => s === 'absent').length
                  const markedDays = presentDays + absentDays
                  const rate = markedDays > 0 ? Math.round((presentDays / markedDays) * 100) : null

                  return (
                    <tr key={student.student_id} className="group hover:bg-slate-800/30">
                      <td className="sticky left-0 z-10 bg-slate-900 group-hover:bg-slate-800/30 px-4 py-2 border-b border-slate-800 whitespace-nowrap">
                        <p className="text-white font-medium">{student.full_name}</p>
                        {student.student_number && (
                          <p className="text-slate-500 text-xs">{student.student_number}</p>
                        )}
                      </td>
                      {Array.from({ length: data.daysInMonth }, (_, i) => i + 1).map(day => {
                        const status = student.days[day]
                        const weekend = isWeekend(day)
                        return (
                          <td key={day} className="py-2 px-0.5 border-b border-slate-800 text-center">
                            <div
                              title={status ? `${status.charAt(0).toUpperCase() + status.slice(1)}` : weekend ? 'Weekend' : 'Not marked'}
                              className={`w-5 h-5 rounded-sm mx-auto ${
                                status === 'present' ? 'bg-green-500' :
                                status === 'absent'  ? 'bg-red-500' :
                                weekend             ? 'bg-slate-800 opacity-40' :
                                                      'bg-slate-700'
                              }`}
                            />
                          </td>
                        )
                      })}
                      <td className="px-3 py-2 border-b border-slate-800 text-center text-green-400 font-medium">{presentDays}</td>
                      <td className="px-3 py-2 border-b border-slate-800 text-center text-red-400 font-medium">{absentDays}</td>
                      <td className="px-3 py-2 border-b border-slate-800 text-center">
                        {rate !== null ? (
                          <span className={`font-semibold ${rate >= 80 ? 'text-green-400' : rate >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
                            {rate}%
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Tab Wrapper ──────────────────────────────────────────────────────────────

type Tab = 'mark' | 'history'

export default function AttendanceTabs({ classId, className, students }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('mark')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/teacher/attendance">
          <Button variant="outline" size="icon" className="border-slate-700 text-slate-400 shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-white">{className}</h1>
      </div>

      {/* Tab buttons */}
      <div className="flex border-b border-slate-700">
        {(['mark', 'history'] as Tab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab === 'mark' ? 'Mark Attendance' : 'View History'}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'mark'
        ? <MarkAttendanceTab classId={classId} students={students} />
        : <ViewHistoryTab classId={classId} />
      }
    </div>
  )
}
