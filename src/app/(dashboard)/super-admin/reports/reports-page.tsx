'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DollarSign,
  TrendingUp,
  Users,
  FileDown,
  Download,
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
} from 'recharts'

interface BillingData {
  totalInvoiced: number
  totalCollected: number
  totalPending: number
  collectionRate: string
  billingBySchool: Array<{
    schoolId: string
    schoolName: string
    agreedAmount: number
    totalPaid: number
    pending: number
    status: string
    salesRep: string | null
  }>
  salesRepPerformance: Record<string, {
    name: string
    invoiced: number
    collected: number
    pending: number
    schools: number
  }>
}

interface SalesRep {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  is_active: boolean
}

interface Payment {
  id: string
  school_id: string
  amount: number
  payment_date: string
  reference: string | null
  notes: string | null
}

export default function ReportsPage({
  billing,
  salesReps,
  payments,
}: {
  billing: BillingData
  salesReps: SalesRep[]
  payments: Payment[]
}) {
  const [activeTab, setActiveTab] = useState<'revenue' | 'outstanding' | 'payment-log' | 'sales-reps'>('revenue')

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Billing Reports</h1>
          <p className="text-slate-400 text-sm mt-1">Platform revenue and billing analytics</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-800">
        {[
          { id: 'revenue' as const, label: 'Revenue', icon: DollarSign },
          { id: 'outstanding' as const, label: 'Outstanding', icon: TrendingUp },
          { id: 'payment-log' as const, label: 'Payment Log', icon: FileDown },
          { id: 'sales-reps' as const, label: 'Sales Team', icon: Users },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Revenue Tab ──────────────────────────────────────────────── */}
      {activeTab === 'revenue' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-400">Total Invoiced</CardTitle>
                <DollarSign className="w-4 h-4 text-amber-400" />
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold text-white">UGX {billing.totalInvoiced.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-400">Total Collected</CardTitle>
                <DollarSign className="w-4 h-4 text-green-400" />
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold text-green-400">UGX {billing.totalCollected.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-400">Collection Rate</CardTitle>
                <TrendingUp className="w-4 h-4 text-blue-400" />
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold text-white">{billing.collectionRate}%</p>
              </CardContent>
            </Card>
          </div>

          {/* Revenue Chart — Top 10 Schools */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Revenue by School (Top 10)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={[...billing.billingBySchool]
                    .sort((a, b) => b.agreedAmount - a.agreedAmount)
                    .slice(0, 10)
                    .map(b => ({
                      name: b.schoolName.split(' ')[0],
                      invoiced: b.agreedAmount,
                      collected: b.totalPaid,
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
                  <Bar dataKey="invoiced" fill="#3b82f6" name="Invoiced" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="collected" fill="#22c55e" name="Collected" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Revenue by School</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-3 px-4 text-sm text-slate-400 font-medium">School</th>
                      <th className="text-right py-3 px-4 text-sm text-slate-400 font-medium">Invoiced</th>
                      <th className="text-right py-3 px-4 text-sm text-slate-400 font-medium">Collected</th>
                      <th className="text-right py-3 px-4 text-sm text-slate-400 font-medium">Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {billing.billingBySchool.map(b => (
                      <tr key={b.schoolId} className="border-b border-slate-800">
                        <td className="py-3 px-4 text-white">{b.schoolName}</td>
                        <td className="py-3 px-4 text-right text-white">UGX {b.agreedAmount.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right text-green-400">UGX {b.totalPaid.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right text-slate-300">
                          {b.agreedAmount > 0 ? ((b.totalPaid / b.agreedAmount) * 100).toFixed(1) : 0}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Button
            onClick={() => downloadCSV(
              'revenue_report.csv',
              ['School', 'Invoiced', 'Collected', 'Pending', 'Rate'],
              billing.billingBySchool.map(b => [
                b.schoolName,
                `UGX ${b.agreedAmount.toLocaleString()}`,
                `UGX ${b.totalPaid.toLocaleString()}`,
                `UGX ${b.pending.toLocaleString()}`,
                `${b.agreedAmount > 0 ? ((b.totalPaid / b.agreedAmount) * 100).toFixed(1) : 0}%`,
              ])
            )}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Revenue CSV
          </Button>
        </>
      )}

      {/* ── Outstanding Tab ──────────────────────────────────────────── */}
      {activeTab === 'outstanding' && (
        <>
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Outstanding Balances</CardTitle>
              <p className="text-slate-400 text-sm">Total outstanding: UGX {billing.totalPending.toLocaleString()}</p>
            </CardHeader>
            <CardContent>
              {billing.billingBySchool.filter(b => b.pending > 0).length === 0 ? (
                <p className="text-slate-400 text-center py-8">All schools are fully paid! 🎉</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="text-left py-3 px-4 text-sm text-slate-400 font-medium">School</th>
                        <th className="text-right py-3 px-4 text-sm text-slate-400 font-medium">Invoiced</th>
                        <th className="text-right py-3 px-4 text-sm text-slate-400 font-medium">Paid</th>
                        <th className="text-right py-3 px-4 text-sm text-slate-400 font-medium">Balance</th>
                        <th className="text-center py-3 px-4 text-sm text-slate-400 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {billing.billingBySchool
                        .filter(b => b.pending > 0)
                        .sort((a, b) => b.pending - a.pending)
                        .map(b => (
                          <tr key={b.schoolId} className="border-b border-slate-800">
                            <td className="py-3 px-4 text-white font-medium">{b.schoolName}</td>
                            <td className="py-3 px-4 text-right text-white">UGX {b.agreedAmount.toLocaleString()}</td>
                            <td className="py-3 px-4 text-right text-green-400">UGX {b.totalPaid.toLocaleString()}</td>
                            <td className="py-3 px-4 text-right text-red-400 font-semibold">UGX {b.pending.toLocaleString()}</td>
                            <td className="py-3 px-4 text-center">
                              <span className={`px-2 py-1 rounded text-xs ${
                                b.status === 'active' ? 'bg-green-500/20 text-green-400'
                                  : b.status === 'draft' ? 'bg-slate-500/20 text-slate-400'
                                  : 'bg-red-500/20 text-red-400'
                              }`}>
                                {b.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Button
            onClick={() => downloadCSV(
              'outstanding_balances.csv',
              ['School', 'Invoiced', 'Paid', 'Balance', 'Status'],
              billing.billingBySchool.filter(b => b.pending > 0).map(b => [
                b.schoolName,
                `UGX ${b.agreedAmount.toLocaleString()}`,
                `UGX ${b.totalPaid.toLocaleString()}`,
                `UGX ${b.pending.toLocaleString()}`,
                b.status,
              ])
            )}
            className="bg-red-600 hover:bg-red-500 text-white font-semibold"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Outstanding CSV
          </Button>
        </>
      )}

      {/* ── Payment Log Tab ──────────────────────────────────────────── */}
      {activeTab === 'payment-log' && (
        <>
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Payment History Log</CardTitle>
              <p className="text-slate-400 text-sm">{payments.length} payments recorded</p>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <p className="text-slate-400 text-center py-8">No payments recorded yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="text-left py-3 px-4 text-sm text-slate-400 font-medium">School</th>
                        <th className="text-right py-3 px-4 text-sm text-slate-400 font-medium">Amount</th>
                        <th className="text-left py-3 px-4 text-sm text-slate-400 font-medium">Reference</th>
                        <th className="text-left py-3 px-4 text-sm text-slate-400 font-medium">Date</th>
                        <th className="text-left py-3 px-4 text-sm text-slate-400 font-medium">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map(p => (
                        <tr key={p.id} className="border-b border-slate-800">
                          <td className="py-3 px-4 text-white">{p.school_id}</td>
                          <td className="py-3 px-4 text-right text-green-400 font-semibold">
                            UGX {p.amount.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-amber-400 font-mono text-sm">
                            {p.reference || '—'}
                          </td>
                          <td className="py-3 px-4 text-slate-300 text-sm">{p.payment_date}</td>
                          <td className="py-3 px-4 text-slate-400 text-sm">{p.notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Button
            onClick={() => downloadCSV(
              'payment_history.csv',
              ['School ID', 'Amount', 'Reference', 'Date', 'Notes'],
              payments.map(p => [
                p.school_id,
                `UGX ${p.amount.toLocaleString()}`,
                p.reference || '',
                p.payment_date,
                p.notes || '',
              ])
            )}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Payment Log CSV
          </Button>
        </>
      )}

      {/* ── Sales Team Tab ───────────────────────────────────────────── */}
      {activeTab === 'sales-reps' && (
        <>
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Sales Rep Performance</CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(billing.salesRepPerformance).length === 0 ? (
                <p className="text-slate-400 text-center py-8">No sales performance data yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="text-left py-3 px-4 text-sm text-slate-400 font-medium">Sales Rep</th>
                        <th className="text-right py-3 px-4 text-sm text-slate-400 font-medium">Schools</th>
                        <th className="text-right py-3 px-4 text-sm text-slate-400 font-medium">Invoiced</th>
                        <th className="text-right py-3 px-4 text-sm text-slate-400 font-medium">Collected</th>
                        <th className="text-right py-3 px-4 text-sm text-slate-400 font-medium">Pending</th>
                        <th className="text-right py-3 px-4 text-sm text-slate-400 font-medium">Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(billing.salesRepPerformance).map(([repId, rep]) => (
                        <tr key={repId} className="border-b border-slate-800">
                          <td className="py-3 px-4 text-white font-medium">{rep.name}</td>
                          <td className="py-3 px-4 text-right text-slate-300">{rep.schools}</td>
                          <td className="py-3 px-4 text-right text-white">UGX {rep.invoiced.toLocaleString()}</td>
                          <td className="py-3 px-4 text-right text-green-400">UGX {rep.collected.toLocaleString()}</td>
                          <td className="py-3 px-4 text-right text-red-400">UGX {rep.pending.toLocaleString()}</td>
                          <td className="py-3 px-4 text-right text-slate-300">
                            {rep.invoiced > 0 ? ((rep.collected / rep.invoiced) * 100).toFixed(1) : 0}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
