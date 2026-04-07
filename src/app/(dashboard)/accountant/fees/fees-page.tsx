'use client'

import { useState, useTransition } from 'react'
import { getFeesByClass, recordPayment } from '@/lib/actions/fees'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  DollarSign,
  CheckCircle,
  AlertTriangle,
  ChevronRight,
  ArrowLeft,
  Receipt,
} from 'lucide-react'

interface ClassDoc {
  id: string
  name: string
  teacher_id: string | null
}

interface FeeData {
  id: string
  student_id: string
  total_amount: number
  amount_paid: number
}

interface StudentData {
  id: string
  full_name: string
  student_number?: string
  status: string
}

type PaymentState = Record<string, { amount: string; receiptNumber: string; notes: string }>

export default function AccountantFeesPage({
  schoolId,
  classes,
}: {
  schoolId: string
  classes: ClassDoc[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selectedClass, setSelectedClass] = useState<ClassDoc | null>(null)
  const [students, setStudents] = useState<StudentData[]>([])
  const [fees, setFees] = useState<Record<string, FeeData>>({})
  const [currentTerm, setCurrentTerm] = useState<{ id: string; name: string; year: number } | null>(null)
  const [payments, setPayments] = useState<PaymentState>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const handleSelectClass = async (cls: ClassDoc) => {
    setLoading(true)
    setSelectedClass(cls)
    setPayments({})
    setErrors({})

    const result = await getFeesByClass(schoolId, cls.id)
    setStudents(result.students as unknown as StudentData[])
    setFees(result.fees)
    setCurrentTerm(result.currentTerm as any)
    setLoading(false)
  }

  const handleBack = () => {
    setSelectedClass(null)
    setStudents([])
    setFees({})
    setCurrentTerm(null)
    setPayments({})
    setErrors({})
  }

  const updatePayment = (studentId: string, field: keyof PaymentState[string], value: string) => {
    setPayments(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value,
      },
    }))
    // Clear error when user types
    if (errors[studentId]) {
      setErrors(prev => {
        const next = { ...prev }
        delete next[studentId]
        return next
      })
    }
  }

  const handleSubmitPayment = (studentId: string) => {
    const payment = payments[studentId]
    const fee = fees[studentId]

    if (!payment || !payment.amount || !payment.receiptNumber) return
    if (!fee) return

    const amount = parseInt(payment.amount)
    const balance = fee.total_amount - fee.amount_paid

    if (amount > balance) {
      setErrors(prev => ({ ...prev, [studentId]: `Amount exceeds balance of UGX ${balance.toLocaleString()}` }))
      return
    }

    startTransition(async () => {
      const result = await recordPayment(schoolId, {
        feeId: fee.id,
        studentId,
        amount,
        receiptNumber: payment.receiptNumber.trim(),
        notes: payment.notes || undefined,
      })

      if (result.success) {
        // Refresh the class data
        const updated = await getFeesByClass(schoolId, selectedClass!.id)
        setStudents(updated.students as unknown as StudentData[])
        setFees(updated.fees)
        // Clear payment form for this student
        setPayments(prev => {
          const next = { ...prev }
          delete next[studentId]
          return next
        })
        router.refresh()
      } else if (result.error) {
        setErrors(prev => ({ ...prev, [studentId]: result.error || 'Payment failed' }))
      }
    })
  }

  // ── Class Selection View ───────────────────────────────────────────────

  if (!selectedClass) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Fee Collection</h1>
          <p className="text-slate-400 text-sm mt-1">Select a class to record student payments</p>
        </div>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-amber-400" />
              Select a Class
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-slate-400 text-center py-8">Loading classes...</p>
            ) : classes.length === 0 ? (
              <p className="text-slate-400 text-center py-8">No classes found. Classes must be created by the school admin first.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {classes.map((cls) => (
                  <button
                    key={cls.id}
                    onClick={() => handleSelectClass(cls)}
                    className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-amber-500 transition-colors text-left group"
                  >
                    <div>
                      <p className="text-white font-medium">{cls.name}</p>
                      <p className="text-slate-400 text-xs mt-1">Click to record payments</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-colors" />
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── Student Payment Entry View ─────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleBack}
            className="border-slate-700 text-slate-400 hover:text-white hover:border-amber-500"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Classes
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-white">{selectedClass.name}</h1>
            <p className="text-slate-400 text-sm mt-1">
              {currentTerm ? `${currentTerm.name} ${currentTerm.year}` : 'No current term'} — Record payments by student
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="py-12 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-amber-500 border-r-transparent" />
            <p className="text-slate-400 mt-3">Loading students...</p>
          </CardContent>
        </Card>
      ) : students.length === 0 ? (
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="py-12 text-center">
            <p className="text-slate-400">No active students in this class.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {students.map((student) => {
            const fee = fees[student.id]
            const balance = fee ? fee.total_amount - fee.amount_paid : null
            const payment = payments[student.id] || { amount: '', receiptNumber: '', notes: '' }
            const error = errors[student.id]
            const isPaid = fee && balance === 0
            const hasNoFee = !fee

            return (
              <Card key={student.id} className="bg-slate-900 border-slate-800">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    {/* Student Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-white font-medium truncate">{student.full_name}</p>
                        {student.student_number && (
                          <span className="text-slate-500 text-xs">#{student.student_number}</span>
                        )}
                        {isPaid && (
                          <span className="flex items-center text-green-400 text-xs">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Paid
                          </span>
                        )}
                        {hasNoFee && (
                          <span className="flex items-center text-slate-500 text-xs">
                            No fee record
                          </span>
                        )}
                      </div>

                      {fee && (
                        <div className="mt-1 flex items-center gap-4 text-sm">
                          <span className="text-slate-400">
                            Total: <span className="text-white">UGX {fee.total_amount.toLocaleString()}</span>
                          </span>
                          <span className="text-slate-400">
                            Paid: <span className="text-green-400">UGX {fee.amount_paid.toLocaleString()}</span>
                          </span>
                          {balance !== null && balance > 0 && (
                            <span className="text-slate-400">
                              Balance: <span className="text-red-400 font-medium">UGX {balance.toLocaleString()}</span>
                            </span>
                          )}
                        </div>
                      )}

                      {error && (
                        <p className="mt-1 text-red-400 text-xs flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          {error}
                        </p>
                      )}
                    </div>

                    {/* Payment Form */}
                    {fee && balance !== null && balance > 0 && (
                      <div className="shrink-0 w-72 space-y-2">
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            placeholder="Amount (UGX)"
                            value={payment.amount}
                            onChange={(e) => updatePayment(student.id, 'amount', e.target.value)}
                            className="bg-slate-800 border-slate-700 text-white text-sm h-9"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Receipt className="w-4 h-4 text-slate-500 shrink-0" />
                          <Input
                            placeholder="Receipt #"
                            value={payment.receiptNumber}
                            onChange={(e) => updatePayment(student.id, 'receiptNumber', e.target.value)}
                            className="bg-slate-800 border-slate-700 text-white text-sm h-9"
                          />
                        </div>
                        <div>
                          <Input
                            placeholder="Notes (optional)"
                            value={payment.notes}
                            onChange={(e) => updatePayment(student.id, 'notes', e.target.value)}
                            className="bg-slate-800 border-slate-700 text-white text-sm h-9"
                          />
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleSubmitPayment(student.id)}
                          disabled={isPending || !payment.amount || !payment.receiptNumber}
                          className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs"
                        >
                          {isPending ? 'Processing...' : 'Record Payment'}
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
