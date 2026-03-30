import { redirect } from 'next/navigation'
import { getSessionUid } from '@/lib/firebase/session'
import { getCurrentProfile } from '@/lib/firebase/queries'
import { adminDb } from '@/lib/firebase/admin'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Building2, Mail, Phone, MapPin, Save } from 'lucide-react'

export default async function SchoolAdminSettingsPage() {
  const uid = await getSessionUid()
  if (!uid) redirect('/login')

  const profile = await getCurrentProfile(uid)
  if (!profile?.school_id) redirect('/login')

  const schoolDoc = await adminDb().collection('schools').doc(profile.school_id).get()
  const school = schoolDoc.exists ? schoolDoc.data() : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-slate-400 text-sm mt-1">Manage school information and settings</p>
      </div>

      {/* School Information */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-amber-400" />
            School Information
          </CardTitle>
          <CardDescription>Update your school&apos;s details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">School Name</Label>
              <Input
                defaultValue={school?.name || ''}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Email</Label>
              <Input
                type="email"
                defaultValue={school?.email || ''}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Phone</Label>
              <Input
                defaultValue={school?.phone || ''}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Address</Label>
              <Input
                defaultValue={school?.address || ''}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold">
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Subscription */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Subscription</CardTitle>
          <CardDescription>View your current subscription status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Current Plan</p>
              <p className="text-slate-400 text-sm capitalize">{school?.subscription_status || 'trial'}</p>
            </div>
            <div className="text-right">
              <p className="text-white font-medium">{school?.subscription_plan || 'Standard'}</p>
              <p className="text-slate-400 text-sm">
                {school?.subscription_status === 'active' ? 'Active' : 'Trial period'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Information */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Your Profile</CardTitle>
          <CardDescription>Update your personal information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Full Name</Label>
              <Input
                defaultValue={profile.full_name || ''}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Email</Label>
              <Input
                type="email"
                defaultValue={profile.email || ''}
                disabled
                className="bg-slate-800 border-slate-700 text-slate-400"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Phone</Label>
              <Input
                defaultValue={profile.phone || ''}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Role</Label>
              <Input
                defaultValue={profile.role?.replace('_', ' ').toUpperCase() || ''}
                disabled
                className="bg-slate-800 border-slate-700 text-slate-400 capitalize"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold">
              <Save className="w-4 h-4 mr-2" />
              Update Profile
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="bg-slate-900 border-red-500/30">
        <CardHeader>
          <CardTitle className="text-red-400">Danger Zone</CardTitle>
          <CardDescription>Irreversible actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Delete School Data</p>
              <p className="text-slate-400 text-sm">
                This will permanently delete all school data including students, teachers, and records.
              </p>
            </div>
            <Button
              variant="destructive"
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete Everything
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
