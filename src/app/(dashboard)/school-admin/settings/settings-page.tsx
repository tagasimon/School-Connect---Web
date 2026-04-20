'use client'

import { useState, useTransition } from 'react'
import { updateMySchool, updateMyProfile } from '@/lib/actions/profile'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Building2, Save } from 'lucide-react'

interface Props {
  schoolId: string
  school: { name?: string; email?: string; phone?: string; address?: string; subscription_status?: string; subscription_plan?: string } | null
  profile: { full_name?: string; email?: string; phone?: string; role?: string }
}

export default function SettingsPage({ schoolId, school, profile }: Props) {
  const [schoolName, setSchoolName] = useState(school?.name || '')
  const [schoolEmail, setSchoolEmail] = useState(school?.email || '')
  const [schoolPhone, setSchoolPhone] = useState(school?.phone || '')
  const [schoolAddress, setSchoolAddress] = useState(school?.address || '')
  const [schoolMsg, setSchoolMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const [fullName, setFullName] = useState(profile.full_name || '')
  const [profilePhone, setProfilePhone] = useState(profile.phone || '')
  const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const [schoolPending, startSchool] = useTransition()
  const [profilePending, startProfile] = useTransition()

  const handleSchoolSave = () => {
    setSchoolMsg(null)
    startSchool(async () => {
      try {
        await updateMySchool(schoolId, {
          name: schoolName,
          email: schoolEmail,
          phone: schoolPhone,
          address: schoolAddress,
        })
        setSchoolMsg({ ok: true, text: 'School information saved.' })
      } catch {
        setSchoolMsg({ ok: false, text: 'Failed to save. Please try again.' })
      }
    })
  }

  const handleProfileSave = () => {
    setProfileMsg(null)
    startProfile(async () => {
      try {
        await updateMyProfile({ fullName, phone: profilePhone })
        setProfileMsg({ ok: true, text: 'Profile updated.' })
      } catch {
        setProfileMsg({ ok: false, text: 'Failed to update. Please try again.' })
      }
    })
  }

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
                value={schoolName}
                onChange={e => setSchoolName(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Email</Label>
              <Input
                type="email"
                value={schoolEmail}
                onChange={e => setSchoolEmail(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Phone</Label>
              <Input
                value={schoolPhone}
                onChange={e => setSchoolPhone(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Address</Label>
              <Input
                value={schoolAddress}
                onChange={e => setSchoolAddress(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
          </div>
          {schoolMsg && (
            <p className={`text-sm ${schoolMsg.ok ? 'text-green-400' : 'text-red-400'}`}>{schoolMsg.text}</p>
          )}
          <div className="flex justify-end">
            <Button
              onClick={handleSchoolSave}
              disabled={schoolPending}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold"
            >
              <Save className="w-4 h-4 mr-2" />
              {schoolPending ? 'Saving...' : 'Save Changes'}
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
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Email</Label>
              <Input
                type="email"
                value={profile.email || ''}
                disabled
                className="bg-slate-800 border-slate-700 text-slate-400"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Phone</Label>
              <Input
                value={profilePhone}
                onChange={e => setProfilePhone(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Role</Label>
              <Input
                value={profile.role?.replace('_', ' ').toUpperCase() || ''}
                disabled
                className="bg-slate-800 border-slate-700 text-slate-400 capitalize"
              />
            </div>
          </div>
          {profileMsg && (
            <p className={`text-sm ${profileMsg.ok ? 'text-green-400' : 'text-red-400'}`}>{profileMsg.text}</p>
          )}
          <div className="flex justify-end">
            <Button
              onClick={handleProfileSave}
              disabled={profilePending}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold"
            >
              <Save className="w-4 h-4 mr-2" />
              {profilePending ? 'Updating...' : 'Update Profile'}
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
            <Button variant="destructive" className="bg-red-600 hover:bg-red-700 text-white">
              Delete Everything
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
