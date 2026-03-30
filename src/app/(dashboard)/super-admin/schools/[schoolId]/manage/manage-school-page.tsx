'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { updateSchool, deleteSchool, createSchoolAdmin } from '@/lib/actions/schools'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft,
  Building2,
  Users,
  GraduationCap,
  BookOpen,
  Mail,
  Phone,
  MapPin,
  Save,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  XCircle,
  X,
} from 'lucide-react'

interface School {
  id: string
  name: string
  email?: string
  phone?: string
  address?: string
  subscription_status: string
  subscription_plan?: string
}

interface Admin {
  id: string
  email: string
  full_name: string
  phone?: string
}

interface Stats {
  students: number
  teachers: number
  classes: number
}

export default function ManageSchoolPage({
  school,
  stats,
  admins,
}: {
  school: School
  stats: Stats
  admins: Admin[]
}) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'overview' | 'details' | 'admins'>('overview')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showAddAdmin, setShowAddAdmin] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [formData, setFormData] = useState({
    name: school.name,
    email: school.email || '',
    phone: school.phone || '',
    address: school.address || '',
    subscriptionPlan: school.subscription_plan || 'standard',
    subscriptionStatus: school.subscription_status,
  })

  const [adminFormData, setAdminFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: '',
  })

  const handleUpdateSchool = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setIsSubmitting(true)

    try {
      const result = await updateSchool(school.id, {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        subscription_plan: formData.subscriptionPlan,
        subscription_status: formData.subscriptionStatus,
      })
      if (result.success) {
        setSuccess('School updated successfully!')
        router.refresh()
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update school')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setIsSubmitting(true)

    try {
      const result = await createSchoolAdmin(school.id, adminFormData)
      if (result.success) {
        setSuccess('Admin added successfully!')
        setShowAddAdmin(false)
        setAdminFormData({ email: '', password: '', full_name: '', phone: '' })
        router.refresh()
      }
    } catch (err: any) {
      setError(err.message || 'Failed to add admin')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteSchool = async () => {
    setError('')
    setIsSubmitting(true)

    try {
      await deleteSchool(school.id)
      router.push('/super-admin/schools')
    } catch (err: any) {
      setError(err.message || 'Failed to delete school')
      setIsSubmitting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    if (status === 'active') {
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Active</Badge>
    }
    if (status === 'trial') {
      return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Trial</Badge>
    }
    return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Inactive</Badge>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/super-admin/schools">
          <Button variant="outline" size="icon" className="border-slate-700 text-slate-400">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">Manage School</h1>
          <p className="text-slate-400 text-sm">{school.name}</p>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(school.subscription_status)}
          <Badge className="bg-slate-700 text-slate-300 capitalize">{school.subscription_plan}</Badge>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-3">
          <XCircle className="w-5 h-5 text-red-400 mt-0.5" />
          <div>
            <p className="text-red-400 font-medium">Error</p>
            <p className="text-red-400/80 text-sm">{error}</p>
          </div>
          <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
          <div>
            <p className="text-green-400 font-medium">Success</p>
            <p className="text-green-400/80 text-sm">{success}</p>
          </div>
          <button onClick={() => setSuccess('')} className="ml-auto text-green-400 hover:text-green-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-800">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-6 py-3 text-sm font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'overview'
              ? 'text-amber-400 border-b-2 border-amber-400 bg-amber-500/5'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Overview
        </button>
        <button
          onClick={() => setActiveTab('details')}
          className={`px-6 py-3 text-sm font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'details'
              ? 'text-amber-400 border-b-2 border-amber-400 bg-amber-500/5'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Save className="w-4 h-4" />
          School Details
        </button>
        <button
          onClick={() => setActiveTab('admins')}
          className={`px-6 py-3 text-sm font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'admins'
              ? 'text-amber-400 border-b-2 border-amber-400 bg-amber-500/5'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          Administrators
          {admins.length > 0 && (
            <span className="ml-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs">
              {admins.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-400">Students</CardTitle>
                <GraduationCap className="w-4 h-4 text-blue-400" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-white">{stats.students}</p>
              </CardContent>
            </Card>
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-400">Teachers</CardTitle>
                <Users className="w-4 h-4 text-green-400" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-white">{stats.teachers}</p>
              </CardContent>
            </Card>
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-400">Classes</CardTitle>
                <BookOpen className="w-4 h-4 text-amber-400" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-white">{stats.classes}</p>
              </CardContent>
            </Card>
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-400">Admins</CardTitle>
                <Users className="w-4 h-4 text-purple-400" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-white">{admins.length}</p>
              </CardContent>
            </Card>
          </div>

          {/* School Info */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">School Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <Building2 className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-slate-400 text-sm">School Name</p>
                    <p className="text-white font-medium">{school.name}</p>
                  </div>
                </div>
                {school.email && (
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-slate-400 text-sm">Email</p>
                      <p className="text-white">{school.email}</p>
                    </div>
                  </div>
                )}
                {school.phone && (
                  <div className="flex items-start gap-3">
                    <Phone className="w-5 h-5 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-slate-400 text-sm">Phone</p>
                      <p className="text-white">{school.phone}</p>
                    </div>
                  </div>
                )}
                {school.address && (
                  <div className="flex items-start gap-3 col-span-2">
                    <MapPin className="w-5 h-5 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-slate-400 text-sm">Address</p>
                      <p className="text-white">{school.address}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Admins Preview */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">School Administrators</CardTitle>
                <Button
                  onClick={() => setActiveTab('admins')}
                  variant="outline"
                  size="sm"
                  className="border-slate-700 text-slate-400"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Manage
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {admins.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No administrators yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {admins.map((admin) => (
                    <div
                      key={admin.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50"
                    >
                      <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-semibold">
                        {admin.full_name?.charAt(0) || 'A'}
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-medium">{admin.full_name}</p>
                        <p className="text-slate-400 text-sm">{admin.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="bg-slate-900 border-red-500/30">
            <CardHeader>
              <CardTitle className="text-red-400 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Danger Zone
              </CardTitle>
              <CardDescription>Irreversible actions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Delete School</p>
                  <p className="text-slate-400 text-sm">
                    This will permanently delete the school and all associated data including students, teachers, and records.
                  </p>
                </div>
                <Button
                  onClick={() => setShowDeleteConfirm(true)}
                  variant="destructive"
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete School
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'details' && (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Edit School Details</CardTitle>
            <CardDescription>Update school information and subscription</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateSchool} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label className="text-slate-300">School Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                    className="bg-slate-800 border-slate-700 text-white"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Phone</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white"
                    required
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label className="text-slate-300">Address</Label>
                  <Input
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
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
                <div className="space-y-2">
                  <Label className="text-slate-300">Subscription Status</Label>
                  <select
                    value={formData.subscriptionStatus}
                    onChange={(e) => setFormData({ ...formData, subscriptionStatus: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="trial">Trial</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Link href="/super-admin/schools">
                  <Button type="button" variant="outline" className="border-slate-700 text-slate-400">
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold"
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {activeTab === 'admins' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={() => setShowAddAdmin(true)}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Administrator
            </Button>
          </div>

          {admins.length === 0 ? (
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="py-12 text-center">
                <Users className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">No administrators yet</p>
                <p className="text-slate-500 text-sm mt-1">Add a school admin to manage this school</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {admins.map((admin) => (
                <Card key={admin.id} className="bg-slate-900 border-slate-800">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-semibold">
                          {admin.full_name?.charAt(0) || 'A'}
                        </div>
                        <div>
                          <p className="text-white font-medium">{admin.full_name}</p>
                          <p className="text-slate-400 text-sm">{admin.email}</p>
                          {admin.phone && (
                            <p className="text-slate-500 text-xs">{admin.phone}</p>
                          )}
                        </div>
                      </div>
                      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                        School Admin
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Admin Modal */}
      {showAddAdmin && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <div>
                <h2 className="text-xl font-bold text-white">Add School Admin</h2>
                <p className="text-slate-400 text-sm">{school.name}</p>
              </div>
              <button
                onClick={() => {
                  setShowAddAdmin(false)
                  setAdminFormData({ email: '', password: '', full_name: '', phone: '' })
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddAdmin} className="p-6 space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Full Name</Label>
                <Input
                  value={adminFormData.full_name}
                  onChange={(e) => setAdminFormData({ ...adminFormData, full_name: e.target.value })}
                  placeholder="e.g., John Doe"
                  className="bg-slate-800 border-slate-700 text-white"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Email</Label>
                <Input
                  type="email"
                  value={adminFormData.email}
                  onChange={(e) => setAdminFormData({ ...adminFormData, email: e.target.value })}
                  placeholder="admin@school.com"
                  className="bg-slate-800 border-slate-700 text-white"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Temporary Password</Label>
                <Input
                  type="password"
                  value={adminFormData.password}
                  onChange={(e) => setAdminFormData({ ...adminFormData, password: e.target.value })}
                  placeholder="Min. 6 characters"
                  className="bg-slate-800 border-slate-700 text-white"
                  required
                  minLength={6}
                />
                <p className="text-xs text-slate-500">The admin can change this after first login</p>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Phone (Optional)</Label>
                <Input
                  value={adminFormData.phone}
                  onChange={(e) => setAdminFormData({ ...adminFormData, phone: e.target.value })}
                  placeholder="+256..."
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAddAdmin(false)
                    setAdminFormData({ email: '', password: '', full_name: '', phone: '' })
                  }}
                  className="border-slate-700 text-slate-400"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold"
                >
                  {isSubmitting ? 'Creating...' : 'Add Admin'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-500/30 rounded-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center text-red-400">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Delete School</h2>
                  <p className="text-slate-400 text-sm">This action cannot be undone</p>
                </div>
              </div>
              <div className="mb-6">
                <p className="text-white font-medium">{school.name}</p>
                <p className="text-slate-400 text-sm mt-1">This will permanently delete:</p>
                <ul className="text-slate-400 text-sm mt-2 space-y-1">
                  <li>• {stats.students} students</li>
                  <li>• {stats.teachers} teachers</li>
                  <li>• {stats.classes} classes</li>
                  <li>• {admins.length} administrators</li>
                  <li>• All results, attendance, and fees records</li>
                </ul>
              </div>
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="border-slate-700 text-slate-400"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleDeleteSchool}
                  disabled={isSubmitting}
                  className="bg-red-600 hover:bg-red-700 text-white font-semibold"
                >
                  {isSubmitting ? 'Deleting...' : 'Delete School'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
