'use client'

import { useState, useTransition } from 'react'
import { createFeeStructure } from '@/lib/actions/fees'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Plus, DollarSign } from 'lucide-react'

interface ClassDoc {
  id: string
  name: string
}

interface TermDoc {
  id: string
  name: string
  year: number
}

interface FeeStructure {
  id: string
  className: string
  termName: string
  amount: number
  payment_deadline: string | null
  notes: string | null
  created_at: string
}

export default function FeeStructuresPage({
  schoolId,
  classes,
  terms,
  feeStructures,
}: {
  schoolId: string
  classes: ClassDoc[]
  terms: TermDoc[]
  feeStructures: FeeStructure[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(false)
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedTerm, setSelectedTerm] = useState(terms[0]?.id || '')
  const [amount, setAmount] = useState('')
  const [deadline, setDeadline] = useState('')
  const [notes, setNotes] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const handleCreate = () => {
    if (!selectedClass || !selectedTerm || !amount) return

    setFormError(null)
    setSuccessMsg(null)
    startTransition(async () => {
      const result = await createFeeStructure(schoolId, {
        classId: selectedClass,
        termId: selectedTerm,
        amount: parseInt(amount),
        paymentDeadline: deadline || undefined,
        notes: notes || undefined,
      })

      if (result.error) {
        setFormError(result.error)
      } else {
        setSuccessMsg(`Created! ${result.created} fee records generated, ${result.skipped} already existed.`)
        setShowForm(false)
        setSelectedClass('')
        setAmount('')
        setDeadline('')
        setNotes('')
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Fee Structures</h1>
          <p className="text-slate-400 text-sm mt-1">Set fees per class per term</p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Fee Structure
        </Button>
      </div>

      {showForm && (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Create Fee Structure</CardTitle>
            <CardDescription className="text-slate-400">
              Set the fee amount for a class in a specific term. This will auto-generate fee records for all students.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-slate-300">Class</label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">Select a class</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-slate-300">Term</label>
                <select
                  value={selectedTerm}
                  onChange={(e) => setSelectedTerm(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {terms.map((term) => (
                    <option key={term.id} value={term.id}>
                      {term.name} {term.year}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-slate-300">Fee Amount (UGX)</label>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="450000"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-slate-300">Payment Deadline (optional)</label>
                <Input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-slate-300">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., Includes tuition, lunch, and activity fees"
                rows={2}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowForm(false)}
                className="border-slate-700 text-slate-400"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={isPending || !selectedClass || !selectedTerm || !amount}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold"
              >
                {isPending ? 'Creating...' : 'Create & Generate Fee Records'}
              </Button>
            </div>

            {formError && <p className="text-red-400 text-sm">{formError}</p>}
          </CardContent>
        </Card>
      )}

      {successMsg && (
        <p className="text-green-400 text-sm px-1">{successMsg}</p>
      )}

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-amber-400" />
            Fee Structures
          </CardTitle>
        </CardHeader>
        <CardContent>
          {feeStructures.length === 0 ? (
            <p className="text-slate-400 text-center py-8">
              No fee structures created. Create your first fee structure to auto-generate fee records for students.
            </p>
          ) : (
            <div className="space-y-3">
              {feeStructures.map((fs) => (
                <div
                  key={fs.id}
                  className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-slate-700"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">{fs.className}</p>
                      <p className="text-slate-400 text-sm">{fs.termName}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-white font-semibold">UGX {parseInt(fs.amount as any).toLocaleString()}</p>
                    {fs.payment_deadline ? (
                      <p className="text-slate-400 text-xs">
                        Deadline: {new Date(fs.payment_deadline as string).toLocaleDateString()}
                      </p>
                    ) : (
                      <p className="text-slate-500 text-xs">No deadline set</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
