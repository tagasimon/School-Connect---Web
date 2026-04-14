'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClass } from '@/lib/actions/classes'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function CreateClassPage({
  schoolId,
  teachers,
  terms,
}: {
  schoolId: string
  teachers: { id: string; full_name: string }[]
  terms: { id: string; name: string; year: number; is_current: boolean }[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState('')
  const [teacherId, setTeacherId] = useState('')
  const [termId, setTermId] = useState(terms.find(t => t.is_current)?.id || terms[0]?.id || '')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = () => {
    if (!name || !termId) return

    setError(null)
    startTransition(async () => {
      const result = await createClass(schoolId, {
        name,
        teacherId: teacherId || undefined,
        termId,
      })

      if (result.error) {
        setError(result.error)
      } else {
        router.push('/school-admin/classes')
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
          <h1 className="text-2xl font-bold text-white">Create Class</h1>
          <p className="text-slate-400 text-sm mt-1">Set up a new class for the current term</p>
        </div>
      </div>

      <Card className="bg-slate-900 border-slate-800 max-w-2xl">
        <CardHeader>
          <CardTitle className="text-white">Class Details</CardTitle>
          <CardDescription className="text-slate-400">
            Assign a teacher and term. You can manage students after creation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-slate-300">Class Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Primary 1 East"
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-slate-300">Assign Teacher (optional)</label>
            <select
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">No teacher assigned</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.full_name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-slate-300">Term</label>
            <select
              value={termId}
              onChange={(e) => setTermId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              {terms.map((term) => (
                <option key={term.id} value={term.id}>
                  {term.name} {term.year} {term.is_current ? '(Current)' : ''}
                </option>
              ))}
            </select>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => router.back()}
              className="border-slate-700 text-slate-400"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isPending || !name || !termId}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold"
            >
              {isPending ? 'Creating...' : 'Create Class'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
