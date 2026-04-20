'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateTeacher, assignTeacherToClasses } from '@/lib/actions/teachers'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Save, X, Plus } from 'lucide-react'
import Link from 'next/link'

interface ClassItem {
  id: string
  name: string
  teacher_id?: string
}

interface Props {
  teacherId: string
  teacher: Record<string, unknown>
  allClasses: ClassItem[]
  assignedClassIds: string[]
}

export default function EditTeacherPage({ teacherId, teacher, allClasses, assignedClassIds }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [fullName, setFullName] = useState((teacher.full_name as string) || '')
  const [phone, setPhone] = useState((teacher.phone as string) || '')

  const existingSubjects = (teacher.subjects as string[]) || []
  const [subjects, setSubjects] = useState<string[]>(existingSubjects)
  const [subjectInput, setSubjectInput] = useState('')

  const [checkedClasses, setCheckedClasses] = useState<Set<string>>(new Set(assignedClassIds))

  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const addSubject = () => {
    const trimmed = subjectInput.trim()
    if (trimmed && !subjects.includes(trimmed)) {
      setSubjects(prev => [...prev, trimmed])
    }
    setSubjectInput('')
  }

  const removeSubject = (s: string) => setSubjects(prev => prev.filter(x => x !== s))

  const toggleClass = (classId: string, alreadyAssigned: boolean) => {
    if (alreadyAssigned) return // additive only — can't unassign
    setCheckedClasses(prev => {
      const next = new Set(prev)
      next.has(classId) ? next.delete(classId) : next.add(classId)
      return next
    })
  }

  const handleSave = () => {
    if (!fullName.trim()) return
    setError(null)
    setSuccess(false)

    startTransition(async () => {
      try {
        const newlyAssigned = [...checkedClasses].filter(id => !assignedClassIds.includes(id))

        await Promise.all([
          updateTeacher(teacherId, { fullName: fullName.trim(), phone: phone.trim() || undefined, subjects }),
          newlyAssigned.length > 0 ? assignTeacherToClasses(teacherId, newlyAssigned) : Promise.resolve(),
        ])

        setSuccess(true)
        setTimeout(() => router.push('/school-admin/teachers'), 800)
      } catch {
        setError('Failed to save changes. Please try again.')
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild className="border-slate-700 text-slate-400 hover:text-white hover:border-amber-500">
          <Link href="/school-admin/teachers">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-white">Edit Teacher</h1>
          <p className="text-slate-400 text-sm mt-1">{teacher.full_name as string}</p>
        </div>
      </div>

      {/* Basic Info */}
      <Card className="bg-slate-900 border-slate-800 max-w-2xl">
        <CardHeader>
          <CardTitle className="text-white">Teacher Details</CardTitle>
          <CardDescription>Email cannot be changed after account creation.</CardDescription>
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
            <Label className="text-slate-300">Email</Label>
            <Input
              value={(teacher.email as string) || ''}
              disabled
              className="bg-slate-800 border-slate-700 text-slate-400"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-300">Phone</Label>
            <Input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+256 700 000 000"
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>
        </CardContent>
      </Card>

      {/* Subjects */}
      <Card className="bg-slate-900 border-slate-800 max-w-2xl">
        <CardHeader>
          <CardTitle className="text-white">Subjects / Lessons</CardTitle>
          <CardDescription>Subjects this teacher is qualified to teach.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={subjectInput}
              onChange={e => setSubjectInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSubject() } }}
              placeholder="e.g. Mathematics"
              className="bg-slate-800 border-slate-700 text-white"
            />
            <Button
              type="button"
              onClick={addSubject}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold shrink-0"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          {subjects.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {subjects.map(s => (
                <span key={s} className="flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-sm">
                  {s}
                  <button onClick={() => removeSubject(s)} className="ml-1 text-amber-400 hover:text-white">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Class Assignment */}
      <Card className="bg-slate-900 border-slate-800 max-w-2xl">
        <CardHeader>
          <CardTitle className="text-white">Class Assignment</CardTitle>
          <CardDescription>Select classes for this teacher. Already-assigned classes cannot be removed here.</CardDescription>
        </CardHeader>
        <CardContent>
          {allClasses.length === 0 ? (
            <p className="text-slate-400 text-sm">No classes found. Add classes first.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {allClasses.map(cls => {
                const alreadyAssigned = assignedClassIds.includes(cls.id)
                const isChecked = checkedClasses.has(cls.id)
                const takenByOther = cls.teacher_id && cls.teacher_id !== teacherId

                return (
                  <label
                    key={cls.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                      isChecked
                        ? 'border-amber-500 bg-amber-500/10'
                        : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                    } ${takenByOther ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={alreadyAssigned || !!takenByOther}
                      onChange={() => toggleClass(cls.id, alreadyAssigned)}
                      className="accent-amber-500"
                    />
                    <span className="text-white text-sm">{cls.name}</span>
                    {alreadyAssigned && <span className="ml-auto text-xs text-amber-400">Assigned</span>}
                    {takenByOther && <span className="ml-auto text-xs text-slate-500">Taken</span>}
                  </label>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {error && <p className="text-red-400 text-sm max-w-2xl">{error}</p>}
      {success && <p className="text-green-400 text-sm max-w-2xl">Changes saved. Redirecting...</p>}

      <div className="flex gap-3 max-w-2xl justify-end">
        <Button variant="outline" asChild className="border-slate-700 text-slate-400">
          <Link href="/school-admin/teachers">Cancel</Link>
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
