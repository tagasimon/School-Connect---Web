'use client'

import { useState, useTransition } from 'react'
import { createSalesRep, updateSalesRep, deleteSalesRep } from '@/lib/actions/billing'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Plus, Users, Edit2, Trash2, CheckCircle, XCircle, Eye } from 'lucide-react'

interface SalesRep {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  is_active: boolean
}

interface SalesRepPerformance {
  [repId: string]: {
    name: string
    invoiced: number
    collected: number
    pending: number
    schools: number
  }
}

export default function SalesRepsPage({
  salesReps: initialReps,
  salesRepPerformance,
}: {
  salesReps: SalesRep[]
  salesRepPerformance: SalesRepPerformance
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ fullName: '', email: '', phone: '' })

  const [salesReps, setSalesReps] = useState(initialReps)

  const handleCreate = () => {
    if (!formData.fullName.trim()) return

    startTransition(async () => {
      await createSalesRep(formData)
      setFormData({ fullName: '', email: '', phone: '' })
      setShowForm(false)
      router.refresh()
    })
  }

  const handleToggleActive = (rep: SalesRep) => {
    startTransition(async () => {
      await updateSalesRep(rep.id, { isActive: !rep.is_active })
      router.refresh()
    })
  }

  const handleDelete = (id: string) => {
    if (!confirm('Delete this sales rep? This cannot be undone.')) return
    startTransition(async () => {
      await deleteSalesRep(id)
      setSalesReps(prev => prev.filter(r => r.id !== id))
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Sales Representatives</h1>
          <p className="text-slate-400 text-sm mt-1">Manage your sales team</p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Sales Rep
        </Button>
      </div>

      {showForm && (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">New Sales Representative</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-slate-300">Full Name *</label>
                <Input
                  value={formData.fullName}
                  onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                  placeholder="e.g., Moses Ssekandi"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-slate-300">Email</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="moses@example.com"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-slate-300">Phone</label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+256772000001"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowForm(false)}
                className="border-slate-700 text-slate-400"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={isPending || !formData.fullName.trim()}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold"
              >
                {isPending ? 'Creating...' : 'Create Sales Rep'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-400" />
            Sales Team ({salesReps.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {salesReps.length === 0 ? (
            <p className="text-slate-400 text-center py-8">No sales representatives added yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-4 text-sm text-slate-400 font-medium">Name</th>
                    <th className="text-left py-3 px-4 text-sm text-slate-400 font-medium">Email</th>
                    <th className="text-left py-3 px-4 text-sm text-slate-400 font-medium">Phone</th>
                    <th className="text-right py-3 px-4 text-sm text-slate-400 font-medium">Schools</th>
                    <th className="text-right py-3 px-4 text-sm text-slate-400 font-medium">Collected</th>
                    <th className="text-right py-3 px-4 text-sm text-slate-400 font-medium">Rate</th>
                    <th className="text-center py-3 px-4 text-sm text-slate-400 font-medium">Status</th>
                    <th className="text-center py-3 px-4 text-sm text-slate-400 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {salesReps.map(rep => {
                    const perf = salesRepPerformance?.[rep.id]
                    const rate = perf && perf.invoiced > 0
                      ? ((perf.collected / perf.invoiced) * 100).toFixed(1)
                      : '0'
                    return (
                      <tr key={rep.id} className="border-b border-slate-800">
                        <td className="py-3 px-4">
                          <Link
                            href={`/super-admin/sales-reps/${rep.id}`}
                            className="text-amber-400 hover:text-amber-300 font-medium hover:underline"
                          >
                            {rep.full_name}
                          </Link>
                        </td>
                        <td className="py-3 px-4 text-slate-300">{rep.email || '—'}</td>
                        <td className="py-3 px-4 text-slate-300">{rep.phone || '—'}</td>
                        <td className="py-3 px-4 text-right text-slate-300">{perf?.schools || 0}</td>
                        <td className="py-3 px-4 text-right text-green-400">
                          {perf ? `UGX ${perf.collected.toLocaleString()}` : '—'}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-300">{rate}%</td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleToggleActive(rep)}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${
                              rep.is_active
                                ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                                : 'bg-slate-500/20 text-slate-400 hover:bg-slate-500/30'
                            }`}
                          >
                            {rep.is_active ? (
                              <><CheckCircle className="w-3 h-3" /> Active</>
                            ) : (
                              <><XCircle className="w-3 h-3" /> Inactive</>
                            )}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Link
                              href={`/super-admin/sales-reps/${rep.id}`}
                              className="text-blue-400 hover:text-blue-300"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                            <button
                              onClick={() => handleDelete(rep.id)}
                              className="text-red-400 hover:text-red-300"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
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
