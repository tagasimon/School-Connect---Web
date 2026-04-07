'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  DollarSign,
  CheckCircle,
  AlertTriangle,
  Download,
  Receipt,
  ArrowLeft,
} from 'lucide-react'

interface ChildData {
  studentId: string
  fullName: string
  studentNumber: string | null
  className: string
  isPrimary: boolean
  relationship: string | null
  fee: Record<string, any> | null
  payments: Record<string, any>[]
}

export default function ParentFeesPage({ children }: { children: ChildData[] }) {
  const downloadCSV = (childName: string, headers: string[], rows: string[][]) => {
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${childName}_fee_status.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const exportChildReport = (child: ChildData) => {
    const fee = child.fee
    const balance = fee ? fee.total_amount - fee.amount_paid : null

    downloadCSV(
      child.fullName.replace(/\s+/g, '_'),
      ['Student', 'Class', 'Total', 'Paid', 'Balance', 'Status'],
      [
        [
          child.fullName,
          child.className,
          fee ? `UGX ${fee.total_amount.toLocaleString()}` : 'N/A',
          fee ? `UGX ${fee.amount_paid.toLocaleString()}` : 'N/A',
          balance !== null ? `UGX ${balance.toLocaleString()}` : 'N/A',
          fee
            ? fee.amount_paid >= fee.total_amount
              ? 'Fully Paid'
              : fee.amount_paid > 0
                ? 'Partially Paid'
                : 'Unpaid'
            : 'No Fee Record',
        ],
      ]
    )
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
          <Link href="/parent">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-white">Child Fee Status</h1>
          <p className="text-slate-400 text-sm mt-1">Track fees and payments for your children</p>
        </div>
      </div>

      {children.length === 0 ? (
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="py-12 text-center">
            <p className="text-slate-400">No children linked to your account. Contact the school administrator.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {children.map((child) => {
            const fee = child.fee
            const balance = fee ? fee.total_amount - fee.amount_paid : null
            const isPaid = fee && fee.amount_paid >= fee.total_amount
            const hasNoFee = !fee

            return (
              <Card key={child.studentId} className="bg-slate-900 border-slate-800">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-white flex items-center gap-2">
                        {child.fullName}
                        {child.isPrimary && (
                          <span className="text-xs text-amber-400 font-normal">(Primary)</span>
                        )}
                      </CardTitle>
                      <p className="text-slate-400 text-sm mt-1">
                        {child.className}
                        {child.studentNumber && ` • #${child.studentNumber}`}
                        {child.relationship && ` • ${child.relationship}`}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => exportChildReport(child)}
                      className="border-slate-700 text-slate-400 hover:text-white hover:border-amber-500 print:hidden"
                    >
                      <Download className="w-3 h-3 mr-1" />
                      CSV
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {hasNoFee ? (
                    <p className="text-slate-400 py-4">No fee record found for this student.</p>
                  ) : (
                    <div className="space-y-4">
                      {/* Fee Summary */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="p-4 rounded-lg bg-slate-800/50">
                          <p className="text-slate-400 text-xs">Total Fees</p>
                          <p className="text-xl font-bold text-white mt-1">
                            UGX {fee!.total_amount.toLocaleString()}
                          </p>
                        </div>
                        <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                          <p className="text-slate-400 text-xs">Amount Paid</p>
                          <p className="text-xl font-bold text-green-400 mt-1">
                            UGX {fee!.amount_paid.toLocaleString()}
                          </p>
                        </div>
                        <div className={`p-4 rounded-lg ${
                          isPaid
                            ? 'bg-green-500/10 border border-green-500/20'
                            : 'bg-red-500/10 border border-red-500/20'
                        }`}>
                          <p className="text-slate-400 text-xs">Balance</p>
                          <p className={`text-xl font-bold mt-1 ${
                            isPaid ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {isPaid ? 'Fully Paid' : `UGX ${balance!.toLocaleString()}`}
                          </p>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div className="flex items-center gap-2">
                        {isPaid ? (
                          <span className="flex items-center text-green-400 text-sm font-medium">
                            <CheckCircle className="w-4 h-4 mr-1" />
                            All fees paid
                          </span>
                        ) : fee!.amount_paid > 0 ? (
                          <span className="flex items-center text-amber-400 text-sm font-medium">
                            <AlertTriangle className="w-4 h-4 mr-1" />
                            Partially paid — UGX {balance!.toLocaleString()} remaining
                          </span>
                        ) : (
                          <span className="flex items-center text-red-400 text-sm font-medium">
                            <AlertTriangle className="w-4 h-4 mr-1" />
                            Unpaid
                          </span>
                        )}
                      </div>

                      {/* Payment History */}
                      {child.payments.length > 0 && (
                        <div>
                          <h4 className="text-white font-medium mb-2">Payment History</h4>
                          <div className="space-y-2">
                            {child.payments.map((payment) => (
                              <div
                                key={payment.id}
                                className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700"
                              >
                                <div className="flex items-center gap-3">
                                  <Receipt className="w-4 h-4 text-amber-400" />
                                  <div>
                                    <p className="text-white text-sm font-mono">
                                      {payment.receipt_number as string}
                                    </p>
                                    <p className="text-slate-400 text-xs">
                                      {payment.payment_date as string}
                                    </p>
                                  </div>
                                </div>
                                <p className="text-green-400 font-semibold">
                                  UGX {(payment.amount as number).toLocaleString()}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
