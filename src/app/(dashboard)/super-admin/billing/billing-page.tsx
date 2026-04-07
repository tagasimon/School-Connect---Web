'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  Users,
} from 'lucide-react'

interface BillingData {
  totalInvoiced: number
  totalCollected: number
  totalPending: number
  collectionRate: string
  billingBySchool: Array<{
    contractId: string
    schoolId: string
    schoolName: string
    agreedAmount: number
    totalPaid: number
    pending: number
    status: string
    salesRep: string | null
    startDate: string | null
    endDate: string | null
  }>
  salesRepPerformance: Record<string, {
    name: string
    invoiced: number
    collected: number
    pending: number
    schools: number
  }>
}

export default function BillingPage({ billing }: { billing: BillingData }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Platform Billing</h1>
        <p className="text-slate-400 text-sm mt-1">SchoolConnect subscription billing overview</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Total Invoiced</CardTitle>
            <DollarSign className="w-4 h-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">UGX {billing.totalInvoiced.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Total Collected</CardTitle>
            <CheckCircle className="w-4 h-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">UGX {billing.totalCollected.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Outstanding</CardTitle>
            <AlertTriangle className="w-4 h-4 text-red-400" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">UGX {billing.totalPending.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Collection Rate</CardTitle>
            <TrendingUp className="w-4 h-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">{billing.collectionRate}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Schools Billing Table */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">School Billing Status</CardTitle>
        </CardHeader>
        <CardContent>
          {billing.billingBySchool.length === 0 ? (
            <p className="text-slate-400 text-center py-8">
              No contracts created yet. Set up billing for schools from their manage page.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-4 text-sm text-slate-400 font-medium">School</th>
                    <th className="text-right py-3 px-4 text-sm text-slate-400 font-medium">Invoiced</th>
                    <th className="text-right py-3 px-4 text-sm text-slate-400 font-medium">Collected</th>
                    <th className="text-right py-3 px-4 text-sm text-slate-400 font-medium">Pending</th>
                    <th className="text-center py-3 px-4 text-sm text-slate-400 font-medium">Status</th>
                    <th className="text-left py-3 px-4 text-sm text-slate-400 font-medium">Sales Rep</th>
                    <th className="text-center py-3 px-4 text-sm text-slate-400 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {billing.billingBySchool.map(b => (
                    <tr key={b.schoolId} className="border-b border-slate-800">
                      <td className="py-3 px-4 text-white font-medium">{b.schoolName}</td>
                      <td className="py-3 px-4 text-right text-white">UGX {b.agreedAmount.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right text-green-400">UGX {b.totalPaid.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right text-red-400 font-semibold">UGX {b.pending.toLocaleString()}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-1 rounded text-xs ${
                          b.status === 'active' ? 'bg-green-500/20 text-green-400'
                            : b.status === 'draft' ? 'bg-slate-500/20 text-slate-400'
                            : b.status === 'expired' ? 'bg-red-500/20 text-red-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-300 text-sm">{b.salesRep || '—'}</td>
                      <td className="py-3 px-4 text-center">
                        <Button
                          asChild
                          size="sm"
                          variant="outline"
                          className="border-slate-700 text-slate-400 hover:text-white hover:border-amber-500 text-xs"
                        >
                          <Link href={`/super-admin/schools/${b.schoolId}/billing`}>
                            Manage
                            <ArrowRight className="w-3 h-3 ml-1" />
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sales Rep Performance */}
      {Object.keys(billing.salesRepPerformance).length > 0 && (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-400" />
              Sales Rep Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(billing.salesRepPerformance).map(([repId, rep]) => (
                <div key={repId} className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                  <p className="text-white font-medium">{rep.name}</p>
                  <p className="text-slate-400 text-xs mt-1">{rep.schools} school{rep.schools !== 1 ? 's' : ''}</p>
                  <div className="mt-3 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Invoiced</span>
                      <span className="text-white">UGX {rep.invoiced.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Collected</span>
                      <span className="text-green-400">UGX {rep.collected.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Pending</span>
                      <span className="text-red-400">UGX {rep.pending.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
