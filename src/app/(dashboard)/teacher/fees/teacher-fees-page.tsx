'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DollarSign,
  CheckCircle,
  AlertTriangle,
  Download,
  Users,
} from 'lucide-react'

interface StudentData {
  id: string
  full_name: string
  student_number?: string
}

interface FeeData {
  id: string
  total_amount: number
  amount_paid: number
}

interface PaymentData {
  id: string
  amount: number
  receipt_number: string
  payment_date: string
  notes?: string
}

export default function TeacherFeesPage({
  className,
  students,
  fees,
  payments,
}: {
  className: string
  students: StudentData[]
  fees: Record<string, FeeData>
  payments: Record<string, PaymentData[]>
}) {
  const totalBilled = Object.values(fees).reduce((sum, f) => sum + f.total_amount, 0)
  const totalPaid = Object.values(fees).reduce((sum, f) => sum + f.amount_paid, 0)
  const totalBalance = totalBilled - totalPaid
  const fullyPaidCount = Object.values(fees).filter(f => f.amount_paid >= f.total_amount).length
  const collectionRate = totalBilled > 0 ? ((totalPaid / totalBilled) * 100).toFixed(1) : '0'

  const downloadCSV = (filename: string, headers: string[], rows: string[][]) => {
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }

  const exportClassReport = () => {
    downloadCSV(
      `${className}_fees_status.csv`,
      ['Student', 'Student No.', 'Total', 'Paid', 'Balance', 'Status', 'Last Receipt #', 'Last Payment Date'],
      students.map(s => {
        const fee = fees[s.id]
        const studentPayments = payments[s.id] || []
        const lastPayment = studentPayments[0]
        const balance = fee ? fee.total_amount - fee.amount_paid : null
        const status = fee
          ? fee.amount_paid >= fee.total_amount
            ? 'Fully Paid'
            : fee.amount_paid > 0
              ? 'Partially Paid'
              : 'Unpaid'
          : 'No Fee Record'

        return [
          s.full_name,
          s.student_number || '',
          fee ? `UGX ${fee.total_amount.toLocaleString()}` : 'N/A',
          fee ? `UGX ${fee.amount_paid.toLocaleString()}` : 'N/A',
          balance !== null ? `UGX ${balance.toLocaleString()}` : 'N/A',
          status,
          lastPayment?.receipt_number || '',
          lastPayment?.payment_date || '',
        ]
      })
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{className} — Fee Status</h1>
          <p className="text-slate-400 text-sm mt-1">Overview of student fee payments in your class</p>
        </div>
        <Button
          onClick={exportClassReport}
          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold"
        >
          <Download className="w-4 h-4 mr-2" />
          Download CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Total Billed</CardTitle>
            <DollarSign className="w-4 h-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-white">UGX {totalBilled.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Total Collected</CardTitle>
            <CheckCircle className="w-4 h-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-white">UGX {totalPaid.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Outstanding</CardTitle>
            <AlertTriangle className="w-4 h-4 text-red-400" />
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-white">UGX {totalBalance.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Collection Rate</CardTitle>
            <Users className="w-4 h-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-white">{collectionRate}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Student Fee List */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Student Fee Status</CardTitle>
        </CardHeader>
        <CardContent>
          {students.length === 0 ? (
            <p className="text-slate-400 text-center py-8">No active students in this class.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-4 text-sm text-slate-400 font-medium">Student</th>
                    <th className="text-right py-3 px-4 text-sm text-slate-400 font-medium">Total</th>
                    <th className="text-right py-3 px-4 text-sm text-slate-400 font-medium">Paid</th>
                    <th className="text-right py-3 px-4 text-sm text-slate-400 font-medium">Balance</th>
                    <th className="text-center py-3 px-4 text-sm text-slate-400 font-medium">Status</th>
                    <th className="text-left py-3 px-4 text-sm text-slate-400 font-medium">Recent Payments</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map(student => {
                    const fee = fees[student.id]
                    const studentPayments = payments[student.id] || []
                    const balance = fee ? fee.total_amount - fee.amount_paid : null
                    const isPaid = fee && fee.amount_paid >= fee.total_amount
                    const hasNoFee = !fee

                    return (
                      <tr key={student.id} className="border-b border-slate-800">
                        <td className="py-3 px-4">
                          <p className="text-white">{student.full_name}</p>
                          {student.student_number && (
                            <p className="text-slate-500 text-xs">#{student.student_number}</p>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right text-white">
                          {fee ? `UGX ${fee.total_amount.toLocaleString()}` : '—'}
                        </td>
                        <td className="py-3 px-4 text-right text-green-400">
                          {fee ? `UGX ${fee.amount_paid.toLocaleString()}` : '—'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {balance !== null && balance > 0 ? (
                            <span className="text-red-400 font-semibold">UGX {balance.toLocaleString()}</span>
                          ) : isPaid ? (
                            <span className="text-slate-500">—</span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {hasNoFee ? (
                            <span className="px-2 py-1 rounded text-xs bg-slate-700 text-slate-400">No Record</span>
                          ) : isPaid ? (
                            <span className="px-2 py-1 rounded text-xs bg-green-500/20 text-green-400">
                              <CheckCircle className="w-3 h-3 inline mr-1" />
                              Paid
                            </span>
                          ) : fee!.amount_paid > 0 ? (
                            <span className="px-2 py-1 rounded text-xs bg-amber-500/20 text-amber-400">Partial</span>
                          ) : (
                            <span className="px-2 py-1 rounded text-xs bg-red-500/20 text-red-400">Unpaid</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-400 max-w-[200px]">
                          {studentPayments.length > 0 ? (
                            <div>
                              <p className="text-amber-400 font-mono text-xs">{studentPayments[0].receipt_number}</p>
                              <p className="text-xs">{studentPayments[0].payment_date}</p>
                              {studentPayments.length > 1 && (
                                <p className="text-xs text-slate-500">+{studentPayments.length - 1} more</p>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-500 text-xs">No payments</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
