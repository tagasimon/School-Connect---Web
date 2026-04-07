'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { uploadResults } from '@/lib/actions/results'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react'
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
  const [isPending, startTransition] = useTransition()
  const [selectedSubject, setSelectedSubject] = useState(subjects[0]?.id || '')
  const [marks, setMarks] = useState<Record<string, { obtained: string; total: string }>>(
    () => Object.fromEntries(students.map(s => [s.id, { obtained: '', total: '100' }]))
  )
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = () => {
    setError(null)
    setSuccess(false)
    startTransition(async () => {
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
        return
      }
      const result = await uploadResults(params.classId, termId, data)
      if (result.success) {
        setSuccess(true)
        setTimeout(() => router.push('/teacher'), 1500)
      } else {
        setError(result.error || 'Failed to save results')
      }
    })
  }

  const filledCount = Object.values(marks).filter(m => m.obtained).length

  if (subjects.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/teacher">
            <Button variant="outline" size="icon" className="border-slate-700 text-slate-400">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Upload Results - {className}</h1>
          </div>
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
      <div className="flex items-center gap-4">
        <Link href="/teacher">
          <Button variant="outline" size="icon" className="border-slate-700 text-slate-400">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Upload Results - {className}</h1>
          <p className="text-slate-400 text-sm mt-1">Enter marks for each student</p>
        </div>
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

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <span>Students ({students.length})</span>
            <span className="text-sm text-slate-400">{filledCount} entered</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {students.map((student) => (
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
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={isPending || filledCount === 0}
          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold px-8 disabled:opacity-50"
        >
          {isPending ? 'Saving...' : `Save Results (${filledCount} students)`}
        </Button>
      </div>
    </div>
  )
}
