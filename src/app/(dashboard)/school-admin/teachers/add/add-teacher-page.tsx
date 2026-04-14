'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { addTeacher } from '@/lib/actions/teachers'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function AddTeacherPage({
  schoolId,
}: {
  schoolId: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = () => {
    if (!fullName || !email) return

    setError(null)
    startTransition(async () => {
      const result = await addTeacher(schoolId, {
        fullName,
        email,
        phone: phone || undefined,
      })

      if (result.error) {
        setError(result.error)
      } else {
        router.push('/school-admin/teachers')
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild className="border-slate-700 text-slate-400">
          <Link href="/school-admin/teachers">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-white">Add Teacher</h1>
          <p className="text-slate-400 text-sm mt-1">Register a new teaching staff member</p>
        </div>
      </div>

      <Card className="bg-slate-900 border-slate-800 max-w-2xl">
        <CardHeader>
          <CardTitle className="text-white">Teacher Details</CardTitle>
          <CardDescription className="text-slate-400">
            A temporary password will be generated. The teacher should reset it on first login.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-slate-300">Full Name</label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g., John Mukasa"
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-slate-300">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teacher@school.com"
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-slate-300">Phone (optional)</label>
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+256 700 000 000"
              className="bg-slate-800 border-slate-700 text-white"
            />
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
              disabled={isPending || !fullName || !email}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold"
            >
              {isPending ? 'Creating...' : 'Add Teacher'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
