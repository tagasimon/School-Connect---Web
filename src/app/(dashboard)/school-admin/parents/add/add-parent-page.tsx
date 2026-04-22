'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createParentAccount } from '@/lib/actions/parents'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function AddParentPage({ schoolId }: { schoolId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const isValid = name.trim() && email.trim() && password.trim()

  const handleSubmit = () => {
    if (!isValid) return
    setError('')

    startTransition(async () => {
      const result = await createParentAccount(schoolId, { name, phone, email, password })
      if (result.success) {
        router.push(`/school-admin/parents/${result.parentId}`)
      } else {
        setError(result.error)
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
          <Link href="/school-admin/parents">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-white">Add Parent</h1>
          <p className="text-slate-400 text-sm mt-1">Create a parent account for mobile app access</p>
        </div>
      </div>

      <Card className="bg-slate-900 border-slate-800 max-w-lg">
        <CardHeader>
          <CardTitle className="text-white">Parent Details</CardTitle>
          <CardDescription className="text-slate-400">
            The parent will use their email and this password to log in to the SchoolConnect app
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-slate-300">Full Name *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., James Kalule"
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-slate-300">Email Address *</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g., james.kalule@gmail.com"
              className="bg-slate-800 border-slate-700 text-white"
            />
            <p className="text-xs text-slate-500">Used to log in to the mobile app</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-slate-300">Phone Number</label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g., +256701000001"
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-slate-300">App Password *</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Set a password for the parent"
              className="bg-slate-800 border-slate-700 text-white"
            />
            <p className="text-xs text-slate-500">Share this with the parent — they can change it later in the app</p>
          </div>

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          <div className="pt-2">
            <Button
              onClick={handleSubmit}
              disabled={isPending || !isValid}
              className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold"
            >
              {isPending ? 'Creating Account...' : 'Create Parent Account'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
