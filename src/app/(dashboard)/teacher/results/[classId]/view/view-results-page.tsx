'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { ArrowLeft, FileText, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getClassResultsForTerm } from '@/lib/actions/results'

interface Term {
  id: string
  name: string
  is_current?: boolean
}

interface Subject {
  id: string
  name: string
}

interface SubjectResult {
  marks_obtained: number
  marks_total: number
  grade: string
  remarks: string
}

interface StudentRow {
  student_id: string
  full_name: string
  student_number: string | null
  results: Record<string, SubjectResult>
}

interface ClassData {
  subjects: Subject[]
  students: StudentRow[]
}

interface Props {
  classId: string
  className: string
  schoolName: string
  terms: Term[]
  initialTermId: string
  initialData: ClassData
}

function gradeColor(grade: string) {
  if (grade.startsWith('D')) return 'bg-green-500/20 text-green-400'
  if (grade.startsWith('C')) return 'bg-blue-500/20 text-blue-400'
  if (grade.startsWith('P')) return 'bg-amber-500/20 text-amber-400'
  return 'bg-red-500/20 text-red-400'
}

export default function ViewResultsPage({
  classId, className, schoolName, terms, initialTermId, initialData,
}: Props) {
  const [selectedTerm, setSelectedTerm] = useState(initialTermId)
  const [data, setData] = useState<ClassData>(initialData)
  const [isPending, startTransition] = useTransition()
  const [isPdfPending, setIsPdfPending] = useState(false)

  function handleTermChange(termId: string) {
    setSelectedTerm(termId)
    startTransition(async () => {
      const result = await getClassResultsForTerm(classId, termId)
      setData(result)
    })
  }

  async function downloadPDF() {
    if (data.students.length === 0) return
    setIsPdfPending(true)
    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')

      const termName = terms.find(t => t.id === selectedTerm)?.name ?? 'Term'
      const filename = `${schoolName}_${className}_${termName}_Results.pdf`.replace(/\s+/g, '_')

      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      const pageW = doc.internal.pageSize.getWidth()

      // Header
      doc.setFontSize(16)
      doc.setTextColor(245, 158, 11)
      doc.text(schoolName, pageW / 2, 16, { align: 'center' })

      doc.setFontSize(12)
      doc.setTextColor(200, 200, 200)
      doc.text(`Results — ${className}`, pageW / 2, 23, { align: 'center' })

      doc.setFontSize(10)
      doc.setTextColor(150, 150, 150)
      doc.text(`Term: ${termName}`, pageW / 2, 29, { align: 'center' })

      doc.setDrawColor(100, 100, 100)
      doc.line(14, 33, pageW - 14, 33)

      // Build table — each subject gets a "Marks / Grade" pair of sub-columns
      // But jsPDF autoTable doesn't support nested headers cleanly,
      // so we use a single header row: Name | Stud.No | Subj1 Marks | Subj1 Grade | Subj2 Marks ...
      const subjectHeaders = data.subjects.flatMap(s => [`${s.name}\nMarks`, `${s.name}\nGrade`])
      const head = [['#', 'Student Name', 'Stud. No.', ...subjectHeaders]]

      const body = data.students.map((student, i) => {
        const subjectCells = data.subjects.flatMap(s => {
          const r = student.results[s.id]
          if (!r) return ['—', '—']
          return [`${r.marks_obtained}/${r.marks_total}`, r.grade]
        })
        return [i + 1, student.full_name, student.student_number ?? '—', ...subjectCells]
      })

      // Dynamic column widths: fixed for #/name/stud, equal split for subject columns
      const fixedW = 8 + 50 + 22 // #, name, stud no
      const subjectColW = Math.max(14, (pageW - 28 - fixedW) / (data.subjects.length * 2))

      const columnStyles: Record<number, object> = {
        0: { halign: 'center', cellWidth: 8 },
        1: { cellWidth: 50 },
        2: { halign: 'center', cellWidth: 22 },
      }
      data.subjects.forEach((_, i) => {
        columnStyles[3 + i * 2] = { halign: 'center', cellWidth: subjectColW }
        columnStyles[3 + i * 2 + 1] = { halign: 'center', cellWidth: subjectColW }
      })

      autoTable(doc, {
        startY: 38,
        head,
        body,
        styles: {
          fontSize: 8,
          cellPadding: 2.5,
          fillColor: [15, 23, 42],
          textColor: [220, 220, 220],
          lineColor: [51, 65, 85],
          lineWidth: 0.2,
        },
        headStyles: {
          fillColor: [30, 41, 59],
          textColor: [245, 158, 11],
          fontStyle: 'bold',
          halign: 'center',
        },
        alternateRowStyles: { fillColor: [20, 30, 50] },
        columnStyles,
        margin: { left: 14, right: 14 },
      })

      doc.save(filename)
    } finally {
      setIsPdfPending(false)
    }
  }

  const { subjects, students } = data
  const noTerms = terms.length === 0

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-4">
        <Link href={`/teacher/results/${classId}`}>
          <Button variant="outline" size="icon" className="border-slate-700 text-slate-400">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Results — {className}</h1>
          <p className="text-slate-400 text-sm mt-1">All subjects for every student</p>
        </div>
      </div>

      {noTerms ? (
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="py-12 text-center">
            <p className="text-slate-400">No terms found for this school.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Term selector */}
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <label className="text-sm text-slate-400 shrink-0">Term</label>
                <select
                  value={selectedTerm}
                  onChange={e => handleTermChange(e.target.value)}
                  disabled={isPending}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
                >
                  {terms.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name}{t.is_current ? ' (Current)' : ''}
                    </option>
                  ))}
                </select>
                {isPending && <Loader2 className="w-4 h-4 text-amber-400 animate-spin shrink-0" />}
              </div>
            </CardContent>
          </Card>

          {/* Results table */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">
                  {students.length > 0
                    ? `${students.length} students · ${subjects.length} subjects`
                    : 'Results'}
                </CardTitle>
                {students.length > 0 && subjects.length > 0 && (
                  <Button
                    onClick={downloadPDF}
                    disabled={isPdfPending || isPending}
                    variant="outline"
                    className="border-slate-700 text-slate-300 hover:border-amber-500 hover:text-amber-400 gap-2"
                  >
                    {isPdfPending
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <FileText className="w-4 h-4" />}
                    Download PDF
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isPending ? (
                <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Loading results…</span>
                </div>
              ) : students.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-12">
                  No results recorded for this term yet.
                </p>
              ) : subjects.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-12">
                  No subjects set up for this class.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-separate border-spacing-0">
                    <thead>
                      <tr>
                        {/* Sticky student columns */}
                        <th className="text-left py-3 px-3 text-slate-400 font-medium border-b border-slate-700 bg-slate-900 sticky left-0 z-10 whitespace-nowrap">#</th>
                        <th className="text-left py-3 px-3 text-slate-400 font-medium border-b border-slate-700 bg-slate-900 sticky left-6 z-10 whitespace-nowrap min-w-[160px]">Student Name</th>
                        <th className="text-left py-3 px-3 text-slate-400 font-medium border-b border-slate-700 bg-slate-900 whitespace-nowrap">Stud. No.</th>
                        {/* One column per subject */}
                        {subjects.map(s => (
                          <th
                            key={s.id}
                            colSpan={2}
                            className="text-center py-3 px-3 text-amber-400 font-medium border-b border-slate-700 bg-slate-900 whitespace-nowrap"
                          >
                            {s.name}
                          </th>
                        ))}
                      </tr>
                      {/* Sub-header row: Marks | Grade per subject */}
                      <tr>
                        <th className="bg-slate-900 sticky left-0 z-10 border-b border-slate-800" />
                        <th className="bg-slate-900 sticky left-6 z-10 border-b border-slate-800" />
                        <th className="bg-slate-900 border-b border-slate-800" />
                        {subjects.map(s => (
                          <>
                            <th key={`${s.id}-marks`} className="text-center py-1.5 px-2 text-slate-500 text-xs font-normal border-b border-slate-800 bg-slate-900 whitespace-nowrap">Marks</th>
                            <th key={`${s.id}-grade`} className="text-center py-1.5 px-2 text-slate-500 text-xs font-normal border-b border-slate-800 bg-slate-900 whitespace-nowrap">Grade</th>
                          </>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student, i) => (
                        <tr key={student.student_id} className="hover:bg-slate-800/40 group">
                          <td className="py-3 px-3 text-slate-400 border-b border-slate-800 bg-slate-900 group-hover:bg-slate-800/40 sticky left-0 z-10">{i + 1}</td>
                          <td className="py-3 px-3 text-white font-medium border-b border-slate-800 bg-slate-900 group-hover:bg-slate-800/40 sticky left-6 z-10 whitespace-nowrap">{student.full_name}</td>
                          <td className="py-3 px-3 text-slate-400 border-b border-slate-800 whitespace-nowrap">{student.student_number ?? '—'}</td>
                          {subjects.map(s => {
                            const r = student.results[s.id]
                            return r ? (
                              <>
                                <td key={`${s.id}-marks`} className="py-3 px-3 text-slate-300 text-center border-b border-slate-800 whitespace-nowrap">
                                  {r.marks_obtained}/{r.marks_total}
                                </td>
                                <td key={`${s.id}-grade`} className="py-3 px-2 text-center border-b border-slate-800">
                                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${gradeColor(r.grade)}`}>
                                    {r.grade}
                                  </span>
                                </td>
                              </>
                            ) : (
                              <>
                                <td key={`${s.id}-marks`} className="py-3 px-3 text-slate-600 text-center border-b border-slate-800">—</td>
                                <td key={`${s.id}-grade`} className="py-3 px-3 text-slate-600 text-center border-b border-slate-800">—</td>
                              </>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
