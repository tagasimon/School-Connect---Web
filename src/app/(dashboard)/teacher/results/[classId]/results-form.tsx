'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { uploadResults } from '@/lib/actions/results'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, AlertCircle, CheckCircle, Search } from 'lucide-react'
import Link from 'next/link'

interface Student {
  id: string
  full_name: string
  student_number: string | null
}

interface Subject {
  id: string
  name: string
}

export default function ResultsPage({
  params,
  students,
  subjects,
  termId,
  className,
}: {
  params: { classId: string }
  students: Student[]
  subjects: Subject[]
  termId: string
  className: string
}) {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  const [selectedSubject, setSelectedSubject] = useState(subjects[0]?.id || '')
  const [marks, setMarks] = useState<Record<string, { obtained: string; total: string }>>(
    () => Object.fromEntries(students.map(s => [s.id, { obtained: '', total: '100' }]))
  )
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [search, setSearch] = useState('')

  const handleSubmit = async () => {
    if (isPending) return
    setIsPending(true)
    setError(null)
    setSuccess(false)
    try {
      const data = students
        .filter(s => marks[s.id].obtained)
        .map(student => ({
          studentId: student.id,
          subjectId: selectedSubject,
          marksObtained: parseInt(marks[student.id].obtained),
          marksTotal: parseInt(marks[student.id].total) || 100,
        }))
      if (data.length === 0) {
        setError('Please enter marks for at least one student')
        setIsPending(false)
        return
      }
      const result = await uploadResults(params.classId, termId, data)
      if (result.success) {
        setSuccess(true)
        setTimeout(() => router.push('/teacher'), 1500)
      } else {
        setError(result.error || 'Failed to save results')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.')
    } finally {
      setIsPending(false)
    }
  }

  const filledCount = Object.values(marks).filter(m => m.obtained).length

  const filteredStudents = students.filter(s =>
    s.full_name.toLowerCase().includes(search.toLowerCase())
  )

  if (subjects.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/teacher">
            <Button variant="outline" size="icon" className="border-slate-700 text-slate-400">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-white">Upload Results — {className}</h1>
        </div>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="py-12 text-center">
            <p className="text-slate-400">No subjects available for this class. Ask the school admin to add subjects first.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header row — back button, title, save button */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/teacher">
            <Button variant="outline" size="icon" className="border-slate-700 text-slate-400 shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Upload Results — {className}</h1>
            <p className="text-slate-400 text-sm mt-1">Enter marks for each student</p>
          </div>
        </div>
        <Button
          onClick={handleSubmit}
          disabled={isPending || filledCount === 0}
          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold px-8 shrink-0 disabled:opacity-50"
        >
          {isPending ? 'Saving...' : `Save Results (${filledCount} students)`}
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
            <span>Results saved successfully! Redirecting...</span>
          </CardContent>
        </Card>
      )}

      {/* Subject selector */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Select Subject</CardTitle>
        </CardHeader>
        <CardContent>
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      {/* Student list with search */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white">
              Students ({students.length})
            </CardTitle>
            <span className="text-sm text-slate-400">{filledCount} entered</span>
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
              filteredStudents.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center gap-4 p-4 rounded-lg border border-slate-700 bg-slate-800/50"
                >
                  <div className="flex-1">
                    <p className="text-white font-medium">{student.full_name}</p>
                    {student.student_number && (
                      <p className="text-slate-400 text-sm">{student.student_number}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      placeholder="Marks"
                      value={marks[student.id].obtained}
                      onChange={(e) =>
                        setMarks(prev => ({
                          ...prev,
                          [student.id]: { ...prev[student.id], obtained: e.target.value },
                        }))
                      }
                      className="w-24 bg-slate-900 border-slate-700 text-white"
                      min="0"
                      max={marks[student.id].total}
                    />
                    <span className="text-slate-400">/</span>
                    <Input
                      type="number"
                      value={marks[student.id].total}
                      onChange={(e) =>
                        setMarks(prev => ({
                          ...prev,
                          [student.id]: { ...prev[student.id], total: e.target.value },
                        }))
                      }
                      className="w-20 bg-slate-900 border-slate-700 text-white"
                    />
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
