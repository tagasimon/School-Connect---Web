'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { bulkImportStudents } from '@/lib/actions/students'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ArrowLeft, Download, Upload, CheckCircle, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

const CSV_TEMPLATE = `full_name,student_number,date_of_birth,gender,class_name
Brian Ssekandi,P3A/001,2018-03-12,male,P3A
Sharon Nalubega,P3A/002,2018-07-22,female,P3A`

export default function ImportStudentsPage({
  schoolId,
  classes,
}: {
  schoolId: string
  classes: Array<{ id: string; name: string }>
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<Array<Record<string, string>>>([])
  const [errors, setErrors] = useState<string[]>([])
  const [importResult, setImportResult] = useState<{ imported: number; errors: string[] } | null>(null)

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'student_import_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0]
    if (!uploadedFile) return
    setFile(uploadedFile)
    setImportResult(null)

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const lines = text.split('\n').filter(l => l.trim())
      if (lines.length < 2) {
        setErrors(['CSV must have a header row and at least one data row'])
        return
      }

      const headers = lines[0].split(',').map(h => h.trim())
      const rows = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim())
        const row: Record<string, string> = {}
        headers.forEach((h, i) => { row[h] = values[i] || '' })
        return row
      })

      setPreview(rows)
      setErrors([])
    }
    reader.readAsText(uploadedFile)
  }

  const handleImport = () => {
    if (preview.length === 0) return

    const classMap = new Map(classes.map(c => [c.name.toLowerCase(), c.id]))

    const students = preview.map(row => ({
      fullName: row.full_name || row['full_name'] || '',
      studentNumber: row.student_number || row['student_number'] || undefined,
      dateOfBirth: row.date_of_birth || row['date_of_birth'] || '',
      gender: (row.gender || row['gender'] || 'male') as 'male' | 'female' | 'other',
      classId: classMap.get((row.class_name || row['class_name'] || '').toLowerCase()) || '',
    }))

    // Validate
    const validationErrors: string[] = []
    students.forEach((s, i) => {
      if (!s.fullName) validationErrors.push(`Row ${i + 1}: Full name is required`)
      if (!s.dateOfBirth) validationErrors.push(`Row ${i + 1}: Date of birth is required`)
      const className = preview[i].class_name || preview[i]['class_name'] || ''
      if (!s.classId) validationErrors.push(`Row ${i + 1}: Class "${className}" not found`)
    })

    if (validationErrors.length > 0) {
      setErrors(validationErrors)
      return
    }

    startTransition(async () => {
      const result = await bulkImportStudents(schoolId, students)
      setImportResult({ imported: result.imported, errors: result.errors })
      if (result.imported > 0 && result.errors.length === 0) {
        router.push('/school-admin/students')
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          asChild
          className="border-slate-700 text-slate-400 hover:text-white hover:border-amber-500"
        >
          <Link href="/school-admin/students">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-white">Import Students</h1>
          <p className="text-slate-400 text-sm mt-1">Bulk import students via CSV</p>
        </div>
      </div>

      {/* Step 1: Download Template */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">1. Download Template</CardTitle>
          <CardDescription className="text-slate-400">
            Use the CSV template with the correct column headers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={downloadTemplate}
            variant="outline"
            className="border-slate-700 text-slate-400 hover:text-white hover:border-amber-500"
          >
            <Download className="w-4 h-4 mr-2" />
            Download CSV Template
          </Button>
          <div className="mt-4 p-3 rounded-lg bg-slate-800/50 border border-slate-700">
            <p className="text-slate-400 text-xs font-mono">
              full_name, student_number, date_of_birth, gender, class_name
            </p>
            <p className="text-slate-500 text-xs mt-2">
              Parents are assigned separately after import. Create parent accounts first under the Parents section.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Step 2: Upload CSV */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">2. Upload CSV File</CardTitle>
          <CardDescription className="text-slate-400">
            Select your filled CSV file
          </CardDescription>
        </CardHeader>
        <CardContent>
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-700 rounded-lg cursor-pointer hover:border-amber-500 transition-colors">
            <Upload className="w-8 h-8 text-slate-500 mb-2" />
            <span className="text-slate-400 text-sm">
              {file ? file.name : 'Click to select a CSV file'}
            </span>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </CardContent>
      </Card>

      {/* Preview */}
      {preview.length > 0 && (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">3. Preview ({preview.length} students)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    {Object.keys(preview[0]).map(h => (
                      <th key={h} className="text-left py-2 px-3 text-slate-400 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 10).map((row, i) => (
                    <tr key={i} className="border-b border-slate-800">
                      {Object.values(row).map((v, j) => (
                        <td key={j} className="py-2 px-3 text-slate-300">{v}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.length > 10 && (
                <p className="text-slate-500 text-xs mt-2">
                  Showing 10 of {preview.length} rows
                </p>
              )}
            </div>

            <div className="mt-4">
              <Button
                onClick={handleImport}
                disabled={isPending}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold"
              >
                {isPending ? (
                  'Importing...'
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Import {preview.length} Students
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <Card className="bg-slate-900 border-red-500/30">
          <CardHeader>
            <CardTitle className="text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Validation Errors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {errors.map((err, i) => (
                <li key={i} className="text-red-400 text-sm">{err}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Import Result */}
      {importResult && (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-green-400">Import Complete</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-white">
              Successfully imported <strong>{importResult.imported}</strong> student{importResult.imported !== 1 ? 's' : ''}.
            </p>
            {importResult.errors.length > 0 && (
              <div className="mt-2">
                <p className="text-red-400 text-sm">{importResult.errors.length} error(s):</p>
                <ul className="text-red-400 text-sm">
                  {importResult.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
