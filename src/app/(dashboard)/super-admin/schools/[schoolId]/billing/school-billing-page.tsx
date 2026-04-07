'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { upsertSchoolContract, recordContractPayment } from '@/lib/actions/billing'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  ArrowLeft,
  DollarSign,
  CheckCircle,
  AlertTriangle,
  Plus,
  Users,
  FileText,
  Calendar,
  Save,
} from 'lucide-react'
import Link from 'next/link'

interface Contract {
  id: string
  agreed_amount: number
  status: string
  contract_person_name: string | null
  contract_person_phone: string | null
  contract_person_email: string | null
  contract_person_role: string | null
  sales_rep_id: string | null
  start_date: string | null
  end_date: string | null
  notes: string | null
}

interface Payment {
  id: string
  amount: number
  payment_date: string
  reference: string | null
  notes: string | null
}

interface SalesRep {
  id: string
  full_name: string
}

export default function SchoolBillingPage({
  schoolId,
  schoolName,
  contract,
  payments,
  salesReps,
}: {
  schoolId: string
  schoolName: string
  contract: Contract | null
  payments: Payment[]
  salesReps: SalesRep[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showAddPayment, setShowAddPayment] = useState(false)

  // Contract form state
  const [agreedAmount, setAgreedAmount] = useState(contract?.agreed_amount?.toString() || '')
  const [status, setStatus] = useState(contract?.status || 'draft')
  const [cpName, setCpName] = useState(contract?.contract_person_name || '')
  const [cpPhone, setCpPhone] = useState(contract?.contract_person_phone || '')
  const [cpEmail, setCpEmail] = useState(contract?.contract_person_email || '')
  const [cpRole, setCpRole] = useState(contract?.contract_person_role || '')
  const [salesRepId, setSalesRepId] = useState(contract?.sales_rep_id || '')
  const [startDate, setStartDate] = useState(contract?.start_date || '')
  const [endDate, setEndDate] = useState(contract?.end_date || '')
  const [notes, setNotes] = useState(contract?.notes || '')

  // Payment form state
  const [payAmount, setPayAmount] = useState('')
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0])
  const [payRef, setPayRef] = useState('')
  const [payNotes, setPayNotes] = useState('')

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0)
  const agreedAmountNum = contract?.agreed_amount || parseInt(agreedAmount) || 0
  const pending = agreedAmountNum - totalPaid
  const progressPercent = agreedAmountNum > 0 ? Math.min((totalPaid / agreedAmountNum) * 100, 100) : 0

  const handleSaveContract = () => {
    if (!agreedAmount) return

    startTransition(async () => {
      await upsertSchoolContract(schoolId, {
        agreedAmount: parseInt(agreedAmount),
        status: status as any,
        contractPersonName: cpName || undefined,
        contractPersonPhone: cpPhone || undefined,
        contractPersonEmail: cpEmail || undefined,
        contractPersonRole: cpRole || undefined,
        salesRepId: salesRepId || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        notes: notes || undefined,
      })
      router.refresh()
    })
  }

  const handleAddPayment = () => {
    if (!contract || !payAmount) return

    startTransition(async () => {
      const result = await recordContractPayment(schoolId, contract.id, {
        amount: parseInt(payAmount),
        paymentDate: payDate || undefined,
        reference: payRef || undefined,
        notes: payNotes || undefined,
      })

      if (result.success) {
        setShowAddPayment(false)
        setPayAmount('')
        setPayRef('')
        setPayNotes('')
        router.refresh()
      }
    })
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
          <Link href="/super-admin/schools">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-white">{schoolName}</h1>
          <p className="text-slate-400 text-sm mt-1">Billing & Contract Management</p>
        </div>
      </div>

      {/* Payment Status */}
      {contract && (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-amber-400" />
              Payment Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="p-4 rounded-lg bg-slate-800">
                <p className="text-slate-400 text-xs">Agreed Amount</p>
                <p className="text-xl font-bold text-white mt-1">UGX {agreedAmountNum.toLocaleString()}</p>
              </div>
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                <p className="text-slate-400 text-xs">Total Paid</p>
                <p className="text-xl font-bold text-green-400 mt-1">UGX {totalPaid.toLocaleString()}</p>
              </div>
              <div className={`p-4 rounded-lg ${pending > 0 ? 'bg-red-500/10 border border-red-500/20' : 'bg-green-500/10 border border-green-500/20'}`}>
                <p className="text-slate-400 text-xs">{pending > 0 ? 'Pending' : 'Fully Paid'}</p>
                <p className={`text-xl font-bold mt-1 ${pending > 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {pending > 0 ? `UGX ${pending.toLocaleString()}` : '—'}
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Collection Progress</span>
                <span className="text-white font-medium">{progressPercent.toFixed(1)}%</span>
              </div>
              <div className="h-4 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-600 to-green-400 transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contract Details Form */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-400" />
            {contract ? 'Edit Contract' : 'Create Contract'}
          </CardTitle>
          <CardDescription>Set the agreed invoice amount and contract details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm text-slate-300">Agreed Amount (UGX) *</label>
              <Input
                type="number"
                value={agreedAmount}
                onChange={(e) => setAgreedAmount(e.target.value)}
                placeholder="5000000"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-slate-300">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-4">
            <h3 className="text-white font-medium mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-400" />
              Contract Person (at school)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-slate-300">Name</label>
                <Input
                  value={cpName}
                  onChange={(e) => setCpName(e.target.value)}
                  placeholder="e.g., Grace Nakamya"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-slate-300">Role</label>
                <Input
                  value={cpRole}
                  onChange={(e) => setCpRole(e.target.value)}
                  placeholder="e.g., Headteacher"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-slate-300">Phone</label>
                <Input
                  value={cpPhone}
                  onChange={(e) => setCpPhone(e.target.value)}
                  placeholder="+256772000002"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-slate-300">Email</label>
                <Input
                  type="email"
                  value={cpEmail}
                  onChange={(e) => setCpEmail(e.target.value)}
                  placeholder="admin@stjohns.ug"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-4">
            <h3 className="text-white font-medium mb-3">Sales Assignment</h3>
            <div className="space-y-2">
              <label className="text-sm text-slate-300">Sales Representative</label>
              <select
                value={salesRepId}
                onChange={(e) => setSalesRepId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">Unassigned</option>
                {salesReps.map(rep => (
                  <option key={rep.id} value={rep.id}>{rep.full_name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-4">
            <h3 className="text-white font-medium mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              Contract Period
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-slate-300">Start Date</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-slate-300">End Date</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-slate-300">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contract notes..."
              rows={2}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleSaveContract}
              disabled={isPending || !agreedAmount}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold"
            >
              <Save className="w-4 h-4 mr-2" />
              {isPending ? 'Saving...' : contract ? 'Update Contract' : 'Create Contract'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-400" />
              Payment History
            </CardTitle>
            {contract && (
              <Button
                size="sm"
                onClick={() => setShowAddPayment(!showAddPayment)}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs"
              >
                <Plus className="w-3 h-3 mr-1" />
                Add Payment
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!contract ? (
            <p className="text-slate-400 text-center py-4">Create a contract first to record payments.</p>
          ) : showAddPayment ? (
            <div className="space-y-4 mb-4 p-4 rounded-lg bg-slate-800/50 border border-slate-700">
              <h4 className="text-white font-medium">Record Payment</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-slate-300">Amount (UGX) *</label>
                  <Input
                    type="number"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    placeholder={pending > 0 ? `Max: ${pending}` : '0'}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-slate-300">Date</label>
                  <Input
                    type="date"
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-slate-300">Reference / Receipt #</label>
                  <Input
                    value={payRef}
                    onChange={(e) => setPayRef(e.target.value)}
                    placeholder="RCT-001"
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-slate-300">Notes</label>
                  <Input
                    value={payNotes}
                    onChange={(e) => setPayNotes(e.target.value)}
                    placeholder="Optional"
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowAddPayment(false)}
                  className="border-slate-700 text-slate-400"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddPayment}
                  disabled={isPending || !payAmount}
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold text-xs"
                >
                  {isPending ? 'Recording...' : 'Record Payment'}
                </Button>
              </div>
            </div>
          ) : null}

          {payments.length === 0 ? (
            <p className="text-slate-400 text-center py-4">No payments recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-4 text-sm text-slate-400 font-medium">Reference</th>
                    <th className="text-right py-3 px-4 text-sm text-slate-400 font-medium">Amount</th>
                    <th className="text-left py-3 px-4 text-sm text-slate-400 font-medium">Date</th>
                    <th className="text-left py-3 px-4 text-sm text-slate-400 font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map(p => (
                    <tr key={p.id} className="border-b border-slate-800">
                      <td className="py-3 px-4 text-amber-400 font-mono text-sm">
                        {p.reference || '—'}
                      </td>
                      <td className="py-3 px-4 text-right text-green-400 font-semibold">
                        UGX {p.amount.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-slate-300 text-sm">
                        {p.payment_date}
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-sm">
                        {p.notes || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
