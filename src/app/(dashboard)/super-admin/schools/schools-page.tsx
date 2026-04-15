'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { createSchool } from '@/lib/actions/schools'
import { upsertSchoolContract } from '@/lib/actions/billing'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Search, Building2, Users, Calendar, CheckCircle, XCircle, X, UserPlus } from 'lucide-react'

interface SchoolWithCounts {
  id: string
  name: string
  email?: string
  phone?: string
  address?: string
  subscription_status: string
  subscription_plan?: string
  created_at: any
  studentCount: number
  teacherCount: number
  classCount: number
  contractId: string | null
  assignedRepId: string | null
  agreedAmount: number | null
  contractStatus: string | null
}

interface SalesRep {
  id: string
  full_name: string
  is_active: boolean
}

export default function SuperAdminSchoolsPage({
  schoolsData,
  salesReps,
}: {
  schoolsData: SchoolWithCounts[]
  salesReps: SalesRep[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showAddModal, setShowAddModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [assigningSchoolId, setAssigningSchoolId] = useState<string | null>(null)
  const [assigningRepId, setAssigningRepId] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    subscriptionPlan: 'standard',
  })
  const [error, setError] = useState('')

  const handleAssignRep = (schoolId: string, repId: string, agreedAmount: number) => {
    if (!repId) return
    startTransition(async () => {
      await upsertSchoolContract(schoolId, {
        salesRepId: repId,
        agreedAmount,
        status: 'active',
      })
      setAssigningSchoolId(null)
      setAssigningRepId('')
      router.refresh()
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const result = await createSchool(formData)
      if (result.success) {
        setShowAddModal(false)
        setFormData({ name: '', email: '', phone: '', address: '', subscriptionPlan: 'standard' })
        router.refresh()
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create school')
    } finally {
      setIsSubmitting(false)
    }
  }

  const filteredSchools = schoolsData.filter(school =>
    school.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    school.email?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const activeCount = schoolsData.filter(s => s.subscription_status === 'active').length
  const trialCount = schoolsData.filter(s => s.subscription_status === 'trial').length
  const inactiveCount = schoolsData.filter(s => s.subscription_status === 'inactive').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Schools</h1>
          <p className="text-slate-400 text-sm mt-1">Manage all schools on the platform</p>
        </div>
        <Button 
          onClick={() => setShowAddModal(true)}
          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add School
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Total Schools</CardTitle>
            <Building2 className="w-4 h-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">{schoolsData.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Active</CardTitle>
            <CheckCircle className="w-4 h-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">{activeCount}</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Trial</CardTitle>
            <Calendar className="w-4 h-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">{trialCount}</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Inactive</CardTitle>
            <XCircle className="w-4 h-4 text-red-400" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">{inactiveCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search schools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* Schools List */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">All Schools</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredSchools.length === 0 ? (
              <p className="text-slate-400 text-center py-8">
                {searchQuery ? 'No schools match your search.' : 'No schools registered yet.'}
              </p>
            ) : (
              filteredSchools.map((school) => (
                <div
                  key={school.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-slate-700 bg-slate-800/50"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-white font-semibold text-lg">{school.name}</p>
                      <div className="flex items-center gap-4 text-sm text-slate-400">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {school.studentCount} students
                        </span>
                        <span>•</span>
                        <span>{school.teacherCount} teachers</span>
                        <span>•</span>
                        <span>{school.classCount} classes</span>
                      </div>
                      {school.email && (
                        <p className="text-slate-500 text-xs mt-1">{school.email}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          school.subscription_status === 'active'
                            ? 'bg-green-500/20 text-green-400'
                            : school.subscription_status === 'trial'
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        {school.subscription_status}
                      </span>
                      {school.subscription_plan && (
                        <p className="text-slate-500 text-xs mt-1 capitalize">
                          {school.subscription_plan}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Assign Rep Dropdown */}
                      {assigningSchoolId === school.id ? (
                        <div className="flex items-center gap-1">
                          <select
                            value={assigningRepId}
                            onChange={(e) => setAssigningRepId(e.target.value)}
                            className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                            autoFocus
                          >
                            <option value="">Select rep</option>
                            {salesReps.filter(r => r.is_active).map(rep => (
                              <option key={rep.id} value={rep.id}>{rep.full_name}</option>
                            ))}
                          </select>
                          <Button
                            size="sm"
                            onClick={() => handleAssignRep(school.id, assigningRepId, school.agreedAmount || 0)}
                            disabled={isPending || !assigningRepId}
                            className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs px-2 py-1 h-7"
                          >
                            Save
                          </Button>
                          <button
                            onClick={() => { setAssigningSchoolId(null); setAssigningRepId('') }}
                            className="text-slate-400 hover:text-white p-1"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setAssigningSchoolId(school.id)
                            setAssigningRepId(school.assignedRepId || '')
                          }}
                          className="text-slate-400 hover:text-amber-400 p-1"
                          title="Assign Sales Rep"
                        >
                          <UserPlus className="w-4 h-4" />
                        </button>
                      )}
                      {school.assignedRepId && (
                        <span className="text-xs text-slate-500">
                          {salesReps.find(r => r.id === school.assignedRepId)?.full_name?.split(' ')[0] || 'Rep'}
                        </span>
                      )}
                      <Link href={`/super-admin/schools/${school.id}/billing`}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-slate-700 text-slate-400 hover:text-white hover:border-amber-500"
                        >
                          Billing
                        </Button>
                      </Link>
                      <Link href={`/super-admin/schools/${school.id}/manage`}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-slate-700 text-slate-400 hover:text-white"
                        >
                          Manage
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add School Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <h2 className="text-xl font-bold text-white">Add New School</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label className="text-slate-300">School Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., St John's Primary School"
                  className="bg-slate-800 border-slate-700 text-white"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="school@example.com"
                  className="bg-slate-800 border-slate-700 text-white"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Phone</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+256..."
                  className="bg-slate-800 border-slate-700 text-white"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Address</Label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Plot 14, Kampala"
                  className="bg-slate-800 border-slate-700 text-white"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Subscription Plan</Label>
                <select
                  value={formData.subscriptionPlan}
                  onChange={(e) => setFormData({ ...formData, subscriptionPlan: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="standard">Standard</option>
                  <option value="premium">Premium</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddModal(false)}
                  className="border-slate-700 text-slate-400"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold"
                >
                  {isSubmitting ? 'Creating...' : 'Create School'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
