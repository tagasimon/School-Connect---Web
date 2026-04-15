'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  FileDown,
  Download,
  CheckCircle,
  Users,
  School,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

interface ReportData {
  schoolId: string
  schoolName: string
  fees: Record<string, any>[]
  classes: Record<string, any>[]
  terms: Record<string, any>[]
  students: Record<string, any>[]
  payments: Record<string, any>[]
}

export default function AccountantReportsPage({
  schoolId,
  schoolName,
  fees,
  classes,
  terms,
  students,
  payments,
}: ReportData) {
  const [activeTab, setActiveTab] = useState<'overview' | 'by-class' | 'overdue' | 'payments'>('overview')

  const totalBilled = fees.reduce((sum, f) => sum + (f.total_amount as number), 0)
  const totalPaid = fees.reduce((sum, f) => sum + (f.amount_paid as number), 0)
  const totalBalance = totalBilled - totalPaid
  const collectionRate = totalBilled > 0 ? ((totalPaid / totalBilled) * 100).toFixed(1) : '0'
  const fullyPaidCount = fees.filter(f => (f.amount_paid as number) >= (f.total_amount as number)).length

  // Build class-level report data
  const classReportData = classes.map(cls => {
    const classStudents = students.filter(s => s.class_id === cls.id && s.status === 'active')
    const classStudentIds = new Set(classStudents.map(s => s.id))
    const classFees = fees.filter(f => classStudentIds.has(f.student_id))
    const classPaid = classFees.reduce((sum, f) => sum + (f.amount_paid as number), 0)
    const classBilled = classFees.reduce((sum, f) => sum + (f.total_amount as number), 0)
    const classBalance = classBilled - classPaid
    const classPayments = payments.filter(p => classStudentIds.has(p.student_id))
    const fullyPaid = classFees.filter(f => (f.amount_paid as number) >= (f.total_amount as number)).length

    return {
      classId: cls.id,
      className: cls.name as string,
      studentCount: classStudents.length,
      feeCount: classFees.length,
      billed: classBilled,
      paid: classPaid,
      balance: classBalance,
      collectionRate: classBilled > 0 ? ((classPaid / classBilled) * 100).toFixed(1) : '0',
      fullyPaid,
      paymentCount: classPayments.length,
    }
  })

  // Build overdue report (simplified — fees with balance and no recent payment)
  const overdueData = fees
    .filter(f => (f.amount_paid as number) < (f.total_amount as number))
    .map(fee => {
      const student = students.find(s => s.id === fee.student_id)
      const cls = classes.find(c => c.id === student?.class_id)
      const studentFees = fees.filter(x => x.student_id === fee.student_id)
      const studentPayments = payments.filter(p => p.student_id === fee.student_id)
      const lastPayment = studentPayments.length > 0 ? studentPayments[0] : null

      return {
        feeId: fee.id,
        studentName: student?.full_name || 'Unknown',
        studentNumber: student?.student_number || '',
        className: cls?.name || 'Unknown',
        totalAmount: fee.total_amount as number,
        amountPaid: fee.amount_paid as number,
        balance: (fee.total_amount as number) - (fee.amount_paid as number),
        lastPaymentDate: lastPayment ? (lastPayment.payment_date as string) : 'Never',
        lastPaymentAmount: lastPayment ? (lastPayment.amount as number) : 0,
      }
    })
    .sort((a, b) => b.balance - a.balance)

  // ── CSV Export Functions ─────────────────────────────────────────────

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

  const exportOverview = () => {
    downloadCSV(
      `${schoolName}_financial_overview.csv`,
      ['Metric', 'Value'],
      [
        ['Total Billed', `UGX ${totalBilled.toLocaleString()}`],
        ['Total Collected', `UGX ${totalPaid.toLocaleString()}`],
        ['Outstanding Balance', `UGX ${totalBalance.toLocaleString()}`],
        ['Collection Rate', `${collectionRate}%`],
        ['Fully Paid Students', String(fullyPaidCount)],
        ['Students With Balance', String(fees.length - fullyPaidCount)],
        ['Total Fee Records', String(fees.length)],
        ['Total Payments Recorded', String(payments.length)],
      ]
    )
  }

  const exportByClass = () => {
    downloadCSV(
      `${schoolName}_fees_by_class.csv`,
      ['Class', 'Students', 'Fee Records', 'Total Billed', 'Total Paid', 'Balance', 'Collection %', 'Fully Paid'],
      classReportData.map(c => [
        c.className,
        String(c.studentCount),
        String(c.feeCount),
        `UGX ${c.billed.toLocaleString()}`,
        `UGX ${c.paid.toLocaleString()}`,
        `UGX ${c.balance.toLocaleString()}`,
        `${c.collectionRate}%`,
        String(c.fullyPaid),
      ])
    )
  }

  const exportOverdue = () => {
    downloadCSV(
      `${schoolName}_overdue_fees.csv`,
      ['Student', 'Student No.', 'Class', 'Total', 'Paid', 'Balance', 'Last Payment Date', 'Last Payment Amount'],
      overdueData.map(o => [
        o.studentName,
        o.studentNumber,
        o.className,
        `UGX ${o.totalAmount.toLocaleString()}`,
        `UGX ${o.amountPaid.toLocaleString()}`,
        `UGX ${o.balance.toLocaleString()}`,
        o.lastPaymentDate,
        o.lastPaymentAmount > 0 ? `UGX ${o.lastPaymentAmount.toLocaleString()}` : 'N/A',
      ])
    )
  }

  const exportPayments = () => {
    downloadCSV(
      `${schoolName}_payment_records.csv`,
      ['Receipt #', 'Student', 'Class', 'Amount', 'Payment Date', 'Notes'],
      payments.map(p => {
        const student = students.find(s => s.id === p.student_id)
        const cls = classes.find(c => c.id === student?.class_id)
        return [
          p.receipt_number as string,
          student?.full_name || 'Unknown',
          cls?.name || 'Unknown',
          `UGX ${(p.amount as number).toLocaleString()}`,
          p.payment_date as string,
          (p.notes as string) || '',
        ]
      })
    )
  }

  // ── Print Function ───────────────────────────────────────────────────

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-white">Financial Reports</h1>
          <p className="text-slate-400 text-sm mt-1">Generate and download reports for {schoolName}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="border-slate-700 text-slate-400 hover:text-white"
          >
            <FileDown className="w-4 h-4 mr-1" />
            Print / PDF
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-800 print:hidden">
        {[
          { id: 'overview' as const, label: 'Overview' },
          { id: 'by-class' as const, label: 'By Class' },
          { id: 'overdue' as const, label: 'Overdue' },
          { id: 'payments' as const, label: 'Payment Log' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Overview Tab ─────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <>
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
                <TrendingUp className="w-4 h-4 text-green-400" />
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
                <CheckCircle className="w-4 h-4 text-blue-400" />
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold text-white">{collectionRate}%</p>
              </CardContent>
            </Card>
          </div>

          {/* Fee Collection Chart — Billed vs Collected vs Outstanding per Class */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Fee Collection by Class</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={classReportData.map(c => ({
                    name: c.className,
                    billed: c.billed,
                    collected: c.paid,
                    outstanding: c.balance,
                  }))}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis tickFormatter={v => `${(v / 1000).toFixed(0)}K`} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip
                    formatter={v => `UGX ${Number(v).toLocaleString()}`}
                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                  />
                  <Legend />
                  <Bar dataKey="billed" fill="#3b82f6" name="Billed" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="collected" fill="#22c55e" name="Collected" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="outstanding" fill="#f59e0b" name="Outstanding" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
                  <CheckCircle className="w-6 h-6 text-green-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-green-400">{fullyPaidCount}</p>
                  <p className="text-xs text-slate-400 mt-1">Fully Paid</p>
                </div>
                <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
                  <AlertTriangle className="w-6 h-6 text-amber-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-amber-400">{fees.length - fullyPaidCount}</p>
                  <p className="text-xs text-slate-400 mt-1">With Balance</p>
                </div>
                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center">
                  <Users className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-blue-400">{students.length}</p>
                  <p className="text-xs text-slate-400 mt-1">Total Students</p>
                </div>
                <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20 text-center">
                  <DollarSign className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-purple-400">{payments.length}</p>
                  <p className="text-xs text-slate-400 mt-1">Payments Recorded</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="print:hidden">
            <Button
              onClick={exportOverview}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Overview CSV
            </Button>
          </div>
        </>
      )}

      {/* ── By Class Tab ─────────────────────────────────────────────── */}
      {activeTab === 'by-class' && (
        <>
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <School className="w-5 h-5 text-amber-400" />
                Fees by Class
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-3 px-4 text-sm text-slate-400 font-medium">Class</th>
                      <th className="text-right py-3 px-4 text-sm text-slate-400 font-medium">Students</th>
                      <th className="text-right py-3 px-4 text-sm text-slate-400 font-medium">Total Billed</th>
                      <th className="text-right py-3 px-4 text-sm text-slate-400 font-medium">Total Paid</th>
                      <th className="text-right py-3 px-4 text-sm text-slate-400 font-medium">Balance</th>
                      <th className="text-right py-3 px-4 text-sm text-slate-400 font-medium">Collection %</th>
                      <th className="text-right py-3 px-4 text-sm text-slate-400 font-medium">Fully Paid</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classReportData.map(c => (
                      <tr key={c.classId} className="border-b border-slate-800">
                        <td className="py-3 px-4 text-white font-medium">{c.className}</td>
                        <td className="py-3 px-4 text-right text-slate-300">{c.studentCount}</td>
                        <td className="py-3 px-4 text-right text-white">UGX {c.billed.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right text-green-400">UGX {c.paid.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right text-red-400">UGX {c.balance.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            parseFloat(c.collectionRate) >= 80
                              ? 'bg-green-500/20 text-green-400'
                              : parseFloat(c.collectionRate) >= 50
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-red-500/20 text-red-400'
                          }`}>
                            {c.collectionRate}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right text-green-400">{c.fullyPaid}/{c.feeCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="print:hidden">
            <Button
              onClick={exportByClass}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Class Report CSV
            </Button>
          </div>
        </>
      )}

      {/* ── Overdue Tab ──────────────────────────────────────────────── */}
      {activeTab === 'overdue' && (
        <>
          {/* Payment Status PieChart */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Payment Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const fullyPaid = fees.filter(f => (f.amount_paid as number) >= (f.total_amount as number)).length
                const unpaid = fees.filter(f => (f.amount_paid as number) === 0).length
                const partiallyPaid = fees.filter(f => {
                  const paid = f.amount_paid as number
                  const total = f.total_amount as number
                  return paid > 0 && paid < total
                }).length

                const pieData = [
                  { name: 'Fully Paid', value: fullyPaid, color: '#22c55e' },
                  { name: 'Partially Paid', value: partiallyPaid, color: '#f59e0b' },
                  { name: 'Unpaid', value: unpaid, color: '#ef4444' },
                ].filter(d => d.value > 0)

                return pieData.length === 0 ? (
                  <p className="text-slate-400 text-center py-8">No fee data available.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                )
              })()}
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                Overdue Fee Balances
              </CardTitle>
              <p className="text-slate-400 text-sm">
                {overdueData.length} students with outstanding balances, sorted by highest balance
              </p>
            </CardHeader>
            <CardContent>
              {overdueData.length === 0 ? (
                <p className="text-slate-400 text-center py-8">All fees are fully paid! 🎉</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="text-left py-3 px-4 text-sm text-slate-400 font-medium">Student</th>
                        <th className="text-left py-3 px-4 text-sm text-slate-400 font-medium">Class</th>
                        <th className="text-right py-3 px-4 text-sm text-slate-400 font-medium">Total</th>
                        <th className="text-right py-3 px-4 text-sm text-slate-400 font-medium">Paid</th>
                        <th className="text-right py-3 px-4 text-sm text-slate-400 font-medium">Balance</th>
                        <th className="text-left py-3 px-4 text-sm text-slate-400 font-medium">Last Payment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overdueData.slice(0, 50).map(o => (
                        <tr key={o.feeId} className="border-b border-slate-800">
                          <td className="py-3 px-4">
                            <p className="text-white">{o.studentName}</p>
                            {o.studentNumber && <p className="text-slate-500 text-xs">#{o.studentNumber}</p>}
                          </td>
                          <td className="py-3 px-4 text-slate-300">{o.className}</td>
                          <td className="py-3 px-4 text-right text-white">UGX {o.totalAmount.toLocaleString()}</td>
                          <td className="py-3 px-4 text-right text-green-400">UGX {o.amountPaid.toLocaleString()}</td>
                          <td className="py-3 px-4 text-right text-red-400 font-semibold">UGX {o.balance.toLocaleString()}</td>
                          <td className="py-3 px-4 text-slate-400 text-sm">
                            {o.lastPaymentDate !== 'Never' ? (
                              <>
                                <p>{o.lastPaymentDate}</p>
                                <p className="text-green-400 text-xs">UGX {o.lastPaymentAmount.toLocaleString()}</p>
                              </>
                            ) : (
                              <span className="text-red-400 text-xs">No payments</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="print:hidden">
            <Button
              onClick={exportOverdue}
              className="bg-red-600 hover:bg-red-500 text-white font-semibold"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Overdue Report CSV
            </Button>
          </div>
        </>
      )}

      {/* ── Payment Log Tab ──────────────────────────────────────────── */}
      {activeTab === 'payments' && (
        <>
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-amber-400" />
                Payment Records
              </CardTitle>
              <p className="text-slate-400 text-sm">
                {payments.length} payments recorded
              </p>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <p className="text-slate-400 text-center py-8">No payments recorded yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="text-left py-3 px-4 text-sm text-slate-400 font-medium">Receipt #</th>
                        <th className="text-left py-3 px-4 text-sm text-slate-400 font-medium">Student</th>
                        <th className="text-left py-3 px-4 text-sm text-slate-400 font-medium">Class</th>
                        <th className="text-right py-3 px-4 text-sm text-slate-400 font-medium">Amount</th>
                        <th className="text-left py-3 px-4 text-sm text-slate-400 font-medium">Date</th>
                        <th className="text-left py-3 px-4 text-sm text-slate-400 font-medium">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map(p => {
                        const student = students.find(s => s.id === p.student_id)
                        const cls = classes.find(c => c.id === student?.class_id)
                        return (
                          <tr key={p.id} className="border-b border-slate-800">
                            <td className="py-3 px-4 text-amber-400 font-mono text-sm">{p.receipt_number as string}</td>
                            <td className="py-3 px-4 text-white">{student?.full_name || 'Unknown'}</td>
                            <td className="py-3 px-4 text-slate-300">{cls?.name || 'Unknown'}</td>
                            <td className="py-3 px-4 text-right text-green-400 font-semibold">
                              UGX {(p.amount as number).toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-slate-400 text-sm">{p.payment_date as string}</td>
                            <td className="py-3 px-4 text-slate-400 text-sm max-w-[200px] truncate">
                              {(p.notes as string) || '—'}
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

          <div className="print:hidden">
            <Button
              onClick={exportPayments}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Payment Log CSV
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
