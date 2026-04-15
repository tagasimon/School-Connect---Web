'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Users,
  DollarSign,
  TrendingUp,
  CheckCircle,
  Mail,
  Phone,
  ArrowLeft,
} from 'lucide-react'
import Link from 'next/link'

interface Rep {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  is_active: boolean
}

interface Contract {
  id: string
  schoolName: string
  agreed_amount: number
  status: string
  totalPaid?: number
}

interface Payment {
  id: string
  contract_id: string
  school_id: string
  amount: number
  payment_date: string
  reference: string | null
  notes: string | null
}

export default function RepDetailPage({
  rep,
  contracts,
  payments,
  totalInvoiced,
  totalCollected,
}: {
  rep: Rep
  contracts: Contract[]
  payments: Payment[]
  totalInvoiced: number
  totalCollected: number
}) {
  const collectionRate = totalInvoiced > 0 ? ((totalCollected / totalInvoiced) * 100).toFixed(1) : '0'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild className="border-slate-700 text-slate-400">
            <Link href="/super-admin/sales-reps">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-white">{rep.full_name}</h1>
            <div className="flex items-center gap-4 text-sm text-slate-400 mt-1">
              {rep.email && (
                <span className="flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  {rep.email}
                </span>
              )}
              {rep.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {rep.phone}
                </span>
              )}
            </div>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
          rep.is_active
            ? 'bg-green-500/20 text-green-400'
            : 'bg-slate-500/20 text-slate-400'
        }`}>
          {rep.is_active ? 'Active' : 'Inactive'}
        </span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Schools Assigned</CardTitle>
            <Users className="w-4 h-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">{contracts.length}</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Total Invoiced</CardTitle>
            <DollarSign className="w-4 h-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-white">UGX {totalInvoiced.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Total Collected</CardTitle>
            <TrendingUp className="w-4 h-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-green-400">UGX {totalCollected.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Collection Rate</CardTitle>
            <CheckCircle className="w-4 h-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-white">{collectionRate}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Schools Table */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Schools Managed</CardTitle>
        </CardHeader>
        <CardContent>
          {contracts.length === 0 ? (
            <p className="text-slate-400 text-center py-8">No schools assigned to this rep yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-4 text-sm text-slate-400 font-medium">School</th>
                    <th className="text-center py-3 px-4 text-sm text-slate-400 font-medium">Status</th>
                    <th className="text-right py-3 px-4 text-sm text-slate-400 font-medium">Invoiced</th>
                    <th className="text-right py-3 px-4 text-sm text-slate-400 font-medium">Collected</th>
                    <th className="text-right py-3 px-4 text-sm text-slate-400 font-medium">Pending</th>
                  </tr>
                </thead>
                <tbody>
                  {contracts.map(c => {
                    const contractPayments = payments.filter(p => p.contract_id === c.id)
                    const collected = contractPayments.reduce((sum, p) => sum + p.amount, 0)
                    const pending = c.agreed_amount - collected
                    return (
                      <tr key={c.id} className="border-b border-slate-800">
                        <td className="py-3 px-4 text-white font-medium">{c.schoolName}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-1 rounded text-xs ${
                            c.status === 'active' ? 'bg-green-500/20 text-green-400'
                              : c.status === 'draft' ? 'bg-slate-500/20 text-slate-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right text-white">UGX {c.agreed_amount.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right text-green-400">UGX {collected.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right text-red-400">UGX {pending.toLocaleString()}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Payments */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Recent Payments</CardTitle>
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
                  </tr>
                </thead>
                <tbody>
                  {payments.slice(0, 20).map(p => {
                    const contract = contracts.find(c => c.id === p.contract_id)
                    return (
                      <tr key={p.id} className="border-b border-slate-800">
                        <td className="py-3 px-4 text-white">{contract?.schoolName || 'Unknown'}</td>
                        <td className="py-3 px-4 text-right text-green-400 font-semibold">
                          UGX {p.amount.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-amber-400 font-mono text-sm">{p.reference || '—'}</td>
                        <td className="py-3 px-4 text-slate-300 text-sm">{p.payment_date}</td>
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
