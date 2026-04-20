'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateStudent } from '@/lib/actions/students'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'

interface Props {
  classId: string
  studentId: string
  student: Record<string, unknown>
  parent: { id: string; name: string; phone: string; relationship: string } | null
  allClasses: { id: string; name: string }[]
}

export default function EditStudentPage({ classId, studentId, student, parent, allClasses }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [fullName, setFullName] = useState((student.full_name as string) || '')
  const [gender, setGender] = useState((student.gender as string) || '')
  const [dateOfBirth, setDateOfBirth] = useState((student.date_of_birth as string) || '')
  const [selectedClass, setSelectedClass] = useState((student.class_id as string) || classId)

  const [parentName, setParentName] = useState(parent?.name || '')
  const [parentPhone, setParentPhone] = useState(parent?.phone || '')
  const [parentRelationship, setParentRelationship] = useState(parent?.relationship || '')

  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSave = () => {
    if (!fullName.trim()) return
    setError(null)
    setSuccess(false)

    startTransition(async () => {
      try {
        await updateStudent(studentId, {
          fullName: fullName.trim(),
          gender,
          dateOfBirth: dateOfBirth || undefined,
          classId: selectedClass,
          parentName: parentName.trim() || undefined,
          parentPhone: parentPhone.trim() || undefined,
          parentRelationship: parentRelationship.trim() || undefined,
        })
        setSuccess(true)
        setTimeout(() => router.push(`/school-admin/students/${selectedClass}`), 800)
      } catch {
        setError('Failed to save changes. Please try again.')
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild className="border-slate-700 text-slate-400 hover:text-white hover:border-amber-500">
          <Link href={`/school-admin/students/${classId}`}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-white">Edit Student</h1>
          <p className="text-slate-400 text-sm mt-1">{student.full_name as string}</p>
        </div>
      </div>

      {/* Student Details */}
      <Card className="bg-slate-900 border-slate-800 max-w-2xl">
        <CardHeader>
          <CardTitle className="text-white">Student Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-slate-300">Full Name</Label>
            <Input
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">Student Number</Label>
            <Input
              value={(student.student_number as string) || '—'}
              disabled
              className="bg-slate-800 border-slate-700 text-slate-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Gender</Label>
              <select
                value={gender}
                onChange={e => setGender(e.target.value)}
                className="w-full h-10 rounded-md bg-slate-800 border border-slate-700 text-white px-3 text-sm"
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Date of Birth</Label>
              <Input
                type="date"
                value={dateOfBirth}
                onChange={e => setDateOfBirth(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">Class</Label>
            <select
              value={selectedClass}
              onChange={e => setSelectedClass(e.target.value)}
              className="w-full h-10 rounded-md bg-slate-800 border border-slate-700 text-white px-3 text-sm"
            >
              {allClasses.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Parent / Guardian */}
      <Card className="bg-slate-900 border-slate-800 max-w-2xl">
        <CardHeader>
          <CardTitle className="text-white">Parent / Guardian</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-slate-300">Name</Label>
            <Input
              value={parentName}
              onChange={e => setParentName(e.target.value)}
              placeholder="Guardian full name"
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Phone</Label>
              <Input
                value={parentPhone}
                onChange={e => setParentPhone(e.target.value)}
                placeholder="+256 700 000 000"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Relationship</Label>
              <Input
                value={parentRelationship}
                onChange={e => setParentRelationship(e.target.value)}
                placeholder="e.g. Mother"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {error && <p className="text-red-400 text-sm max-w-2xl">{error}</p>}
      {success && <p className="text-green-400 text-sm max-w-2xl">Changes saved. Redirecting...</p>}

      <div className="flex gap-3 max-w-2xl justify-end">
        <Button variant="outline" asChild className="border-slate-700 text-slate-400">
          <Link href={`/school-admin/students/${classId}`}>Cancel</Link>
        </Button>
        <Button
          onClick={handleSave}
          disabled={isPending || !fullName.trim()}
          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold"
        >
          <Save className="w-4 h-4 mr-2" />
          {isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  )
}
