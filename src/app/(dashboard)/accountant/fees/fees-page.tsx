'use client'

import { useState, useTransition } from 'react'
import { getFeesByClass, recordPayment } from '@/lib/actions/fees'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  Send,
  Filter,
} from 'lucide-react'

interface ClassDoc {
  id: string
  name: string
  teacher_id: string | null
  studentCount: number
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

type PaymentInput = Record<string, { amount: string; receiptNumber: string }>

export default function AccountantFeesPage({
  schoolId,
  classes,
}: {
  schoolId: string
  classes: ClassDoc[]
}) {
  const [isPending, startTransition] = useTransition()
  const [selectedClass, setSelectedClass] = useState<ClassDoc | null>(null)
  const [students, setStudents] = useState<StudentData[]>([])
  const [fees, setFees] = useState<Record<string, FeeData>>({})
  const [currentTerm, setCurrentTerm] = useState<{ id: string; name: string; year: number } | null>(null)
  const [paymentInputs, setPaymentInputs] = useState<PaymentInput>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [showPaid, setShowPaid] = useState(true)

  const handleSelectClass = async (cls: ClassDoc) => {
    setSelectedClass(cls)
    setPaymentInputs({})
    setErrors({})
    setShowPaid(true)

    // Skip the fetch entirely for empty classes — show the empty state immediately
    if (cls.studentCount === 0) {
      setStudents([])
      setFees({})
      setCurrentTerm(null)
      setLoading(false)
      return
    }

    setLoading(true)
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
    setPaymentInputs({})
    setErrors({})
    setLoading(false)
  }

  const updateInput = (studentId: string, field: keyof PaymentInput[string], value: string) => {
    setPaymentInputs(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value,
      },
    }))
    if (errors[studentId]) {
      setErrors(prev => {
        const next = { ...prev }
        delete next[studentId]
        return next
      })
    }
  }

  const handleSubmitPayment = (studentId: string) => {
    const input = paymentInputs[studentId]
    const fee = fees[studentId]

    if (!input || !input.amount || !input.receiptNumber) return
    if (!fee) return

    const amount = parseInt(input.amount)
    const balance = fee.total_amount - fee.amount_paid

    if (amount > balance) {
      setErrors(prev => ({ ...prev, [studentId]: `Exceeds balance (UGX ${balance.toLocaleString()})` }))
      return
    }

    startTransition(async () => {
      const result = await recordPayment(schoolId, {
        feeId: fee.id,
        studentId,
        amount,
        receiptNumber: input.receiptNumber.trim(),
      })

      if (result.success) {
        // Optimistic update — no need to re-fetch the whole class
        setFees(prev => ({
          ...prev,
          [studentId]: { ...prev[studentId], amount_paid: result.newAmountPaid },
        }))
        setPaymentInputs(prev => {
          const next = { ...prev }
          delete next[studentId]
          return next
        })
      } else if (result.error) {
        setErrors(prev => ({ ...prev, [studentId]: result.error || 'Failed' }))
      }
    })
  }

  // Filter: show only unpaid if toggle is off
  const filteredStudents = students.filter(s => {
    const fee = fees[s.id]
    if (!showPaid && fee && fee.amount_paid >= fee.total_amount) return false
    return true
  })

  const hasPendingPayments = filteredStudents.some(s => {
    const fee = fees[s.id]
    return fee && fee.amount_paid < fee.total_amount
  })

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
            <CardTitle className="text-white">Select a Class</CardTitle>
          </CardHeader>
          <CardContent>
            {classes.length === 0 ? (
              <p className="text-slate-400 text-center py-8">No classes found.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {classes.map((cls) => (
                  <button
                    key={cls.id}
                    onClick={() => handleSelectClass(cls)}
                    className="p-3 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-amber-500 hover:bg-slate-800 transition-colors text-left"
                  >
                    <p className="text-white font-medium text-sm">{cls.name}</p>
                    <p className="text-slate-500 text-xs mt-0.5">
                      {cls.studentCount === 0 ? 'No students' : `${cls.studentCount} student${cls.studentCount !== 1 ? 's' : ''}`}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── Spreadsheet View ───────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleBack}
            className="border-slate-700 text-slate-400 hover:text-white hover:border-amber-500"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <div>
            <h1 className="text-xl font-bold text-white">{selectedClass.name}</h1>
            <p className="text-slate-400 text-xs">
              {currentTerm ? `${currentTerm.name} ${currentTerm.year}` : ''} — {students.length} students
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowPaid(!showPaid)}
          className={`border-slate-700 text-xs ${showPaid ? 'text-slate-400' : 'text-amber-400 border-amber-500'}`}
        >
          <Filter className="w-3 h-3 mr-1" />
          {showPaid ? 'Show All' : 'Unpaid Only'}
        </Button>
      </div>

      {loading ? (
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="py-12 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-amber-500 border-r-transparent" />
            <p className="text-slate-400 mt-3">Loading students...</p>
          </CardContent>
        </Card>
      ) : filteredStudents.length === 0 ? (
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="py-12 text-center">
            <p className="text-slate-400">{showPaid ? 'No active students in this class.' : 'All students are fully paid!'}</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-slate-900 border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800/80 border-b border-slate-700">
                  <th className="text-left py-3 px-3 text-slate-400 font-medium sticky left-0 bg-slate-800/80 z-10 min-w-[180px]">Student</th>
                  <th className="text-right py-3 px-3 text-slate-400 font-medium w-28">Total</th>
                  <th className="text-right py-3 px-3 text-slate-400 font-medium w-28">Paid</th>
                  <th className="text-right py-3 px-3 text-slate-400 font-medium w-28">Balance</th>
                  <th className="text-right py-3 px-3 text-slate-400 font-medium w-28">Status</th>
                  <th className="text-right py-3 px-3 text-slate-400 font-medium w-28">Amount</th>
                  <th className="text-left py-3 px-3 text-slate-400 font-medium w-32">Receipt #</th>
                  <th className="text-center py-3 px-3 text-slate-400 font-medium w-24">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student, idx) => {
                  const fee = fees[student.id]
                  const balance = fee ? fee.total_amount - fee.amount_paid : null
                  const input = paymentInputs[student.id]
                  const amountValue = input?.amount ?? ''
                  const receiptValue = input?.receiptNumber ?? ''
                  const error = errors[student.id]
                  const isPaid = fee && balance === 0
                  const hasNoFee = !fee
                  const isDimmed = isPaid || hasNoFee

                  return (
                    <tr
                      key={student.id}
                      className={`border-b border-slate-800 transition-colors ${
                        isDimmed ? 'opacity-50' : 'hover:bg-slate-800/30'
                      } ${idx % 2 === 0 ? 'bg-slate-900' : 'bg-slate-900/50'}`}
                    >
                      {/* Student Name — sticky left */}
                      <td className="py-2 px-3 sticky left-0 bg-inherit z-10">
                        <div>
                          <p className={`font-medium truncate max-w-[160px] ${isDimmed ? 'text-slate-500' : 'text-white'}`}>
                            {student.full_name}
                          </p>
                          {student.student_number && (
                            <p className="text-slate-600 text-xs">{student.student_number}</p>
                          )}
                          {error && <p className="text-red-400 text-xs mt-0.5">{error}</p>}
                        </div>
                      </td>

                      {/* Total */}
                      <td className="py-2 px-3 text-right text-slate-300 font-mono text-xs">
                        {fee ? fee.total_amount.toLocaleString() : '—'}
                      </td>

                      {/* Paid */}
                      <td className="py-2 px-3 text-right text-green-400 font-mono text-xs">
                        {fee ? fee.amount_paid.toLocaleString() : '—'}
                      </td>

                      {/* Balance */}
                      <td className={`py-2 px-3 text-right font-mono text-xs font-semibold ${
                        balance !== null && balance > 0 ? 'text-red-400' : 'text-slate-600'
                      }`}>
                        {balance !== null && balance > 0 ? balance.toLocaleString() : '—'}
                      </td>

                      {/* Status */}
                      <td className="py-2 px-3 text-center">
                        {hasNoFee ? (
                          <span className="text-slate-600 text-xs">—</span>
                        ) : isPaid ? (
                          <span className="inline-flex items-center text-green-400 text-xs">
                            <CheckCircle className="w-3 h-3 mr-0.5" />
                            Paid
                          </span>
                        ) : fee!.amount_paid > 0 ? (
                          <span className="inline-flex items-center text-amber-400 text-xs">
                            <AlertTriangle className="w-3 h-3 mr-0.5" />
                            Partial
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-red-400 text-xs">
                            <AlertTriangle className="w-3 h-3 mr-0.5" />
                            Unpaid
                          </span>
                        )}
                      </td>

                      {/* Amount Input */}
                      <td className="py-2 px-3">
                        {fee && !isPaid ? (
                          <Input
                            type="number"
                            placeholder={balance!.toLocaleString()}
                            value={amountValue}
                            onChange={(e) => updateInput(student.id, 'amount', e.target.value)}
                            className="bg-slate-800 border-slate-700 text-white text-xs h-7 px-2 font-mono"
                          />
                        ) : (
                          <span className="text-slate-700 text-xs">—</span>
                        )}
                      </td>

                      {/* Receipt # Input */}
                      <td className="py-2 px-3">
                        {fee && !isPaid ? (
                          <Input
                            placeholder="RCT-001"
                            value={receiptValue}
                            onChange={(e) => updateInput(student.id, 'receiptNumber', e.target.value)}
                            className="bg-slate-800 border-slate-700 text-white text-xs h-7 px-2"
                          />
                        ) : (
                          <span className="text-slate-700 text-xs">—</span>
                        )}
                      </td>

                      {/* Submit Button */}
                      <td className="py-2 px-3 text-center">
                        {fee && !isPaid ? (
                          <Button
                            size="sm"
                            onClick={() => handleSubmitPayment(student.id)}
                            disabled={isPending || !amountValue || !receiptValue}
                            className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs h-7 px-2 font-semibold disabled:opacity-30"
                          >
                            <Send className="w-3 h-3" />
                          </Button>
                        ) : (
                          <span className="text-slate-700 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
