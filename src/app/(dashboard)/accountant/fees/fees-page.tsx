'use client'

import { useState, useTransition } from 'react'
import { updateFeePayment, createFeeRecord } from '@/lib/actions/fees'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { DollarSign, Plus, CheckCircle, AlertTriangle } from 'lucide-react'

interface FeeWithStudent {
  id: string
  student: { full_name: string; student_number?: string } | null
  term: { name: string; year: number } | null
  total_amount: number
  amount_paid: number
  notes?: string
}

interface Student {
  id: string
  full_name: string
  student_number?: string
}

interface Term {
  id: string
  name: string
  year: number
}

export default function FeesPage({
  schoolId,
  initialFees,
  students,
  terms,
}: {
  schoolId: string
  initialFees: FeeWithStudent[]
  students: Student[]
  terms: Term[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState('')
  const [selectedTerm, setSelectedTerm] = useState(terms[0]?.id || '')
  const [totalAmount, setTotalAmount] = useState('')
  const [notes, setNotes] = useState('')

  const handleAddFee = () => {
    if (!selectedStudent || !selectedTerm || !totalAmount) return

    startTransition(async () => {
      const result = await createFeeRecord(schoolId, {
        studentId: selectedStudent,
        termId: selectedTerm,
        totalAmount: parseInt(totalAmount),
        notes: notes || undefined,
      })
      if (result.success) {
        setShowAddForm(false)
        setSelectedStudent('')
        setTotalAmount('')
        setNotes('')
        router.refresh()
      }
    })
  }

  const handlePayment = (feeId: string, amount: number) => {
    startTransition(async () => {
      await updateFeePayment(feeId, amount)
      router.refresh()
    })
  }

  const getStatusColor = (fee: FeeWithStudent) => {
    if (fee.amount_paid >= fee.total_amount) return 'bg-green-500/20 text-green-400'
    if (fee.amount_paid > 0) return 'bg-amber-500/20 text-amber-400'
    return 'bg-red-500/20 text-red-400'
  }

  const getStatusText = (fee: FeeWithStudent) => {
    if (fee.amount_paid >= fee.total_amount) return 'Fully Paid'
    if (fee.amount_paid > 0) return 'Partially Paid'
    return 'Unpaid'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Fee Management</h1>
          <p className="text-slate-400 text-sm mt-1">Track and collect student fees</p>
        </div>
        <Button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Fee Record
        </Button>
      </div>

      {showAddForm && (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Create Fee Record</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-slate-300">Student</label>
              <select
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">Select a student</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.full_name} {student.student_number && `(${student.student_number})`}
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

            <div className="space-y-2">
              <label className="text-sm text-slate-300">Total Amount (UGX)</label>
              <Input
                type="number"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                placeholder="450000"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-slate-300">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes..."
                rows={2}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowAddForm(false)}
                className="border-slate-700 text-slate-400"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddFee}
                disabled={isPending || !selectedStudent || !selectedTerm || !totalAmount}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold"
              >
                {isPending ? 'Creating...' : 'Create Fee Record'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-amber-400" />
            Fee Records
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 text-sm text-slate-400 font-medium">Student</th>
                  <th className="text-left py-3 px-4 text-sm text-slate-400 font-medium">Term</th>
                  <th className="text-right py-3 px-4 text-sm text-slate-400 font-medium">Total</th>
                  <th className="text-right py-3 px-4 text-sm text-slate-400 font-medium">Paid</th>
                  <th className="text-right py-3 px-4 text-sm text-slate-400 font-medium">Balance</th>
                  <th className="text-center py-3 px-4 text-sm text-slate-400 font-medium">Status</th>
                  <th className="text-center py-3 px-4 text-sm text-slate-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {initialFees.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No fee records yet. Create your first fee record.
                    </td>
                  </tr>
                ) : (
                  initialFees.map((fee) => {
                    const balance = fee.total_amount - fee.amount_paid
                    return (
                      <tr key={fee.id} className="border-b border-slate-800">
                        <td className="py-3 px-4 text-white">
                          {fee.student?.full_name || 'Unknown'}
                          {fee.student?.student_number && (
                            <span className="text-slate-400 text-sm block">
                              {fee.student.student_number}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-300">
                          {fee.term ? `${fee.term.name} ${fee.term.year}` : 'Unknown'}
                        </td>
                        <td className="py-3 px-4 text-right text-white">
                          UGX {fee.total_amount.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right text-green-400">
                          UGX {fee.amount_paid.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right text-red-400">
                          UGX {balance.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-1 rounded text-xs ${getStatusColor(fee)}`}>
                            {getStatusText(fee)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {balance > 0 && (
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                size="sm"
                                onClick={() => handlePayment(fee.id, balance)}
                                className="bg-green-600 hover:bg-green-700 text-white text-xs"
                              >
                                Pay All
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handlePayment(fee.id, 50000)}
                                variant="outline"
                                className="border-slate-700 text-slate-400 text-xs"
                              >
                                +50K
                              </Button>
                            </div>
                          )}
                          {balance === 0 && (
                            <span className="flex items-center justify-center text-green-400">
                              <CheckCircle className="w-4 h-4" />
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
