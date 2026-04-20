import { redirect } from 'next/navigation'
import { getSessionUid } from '@/lib/firebase/session'
import { getCurrentProfile } from '@/lib/firebase/queries'
import { adminDb } from '@/lib/firebase/admin'
import SettingsPage from './settings-page'

export default async function SchoolAdminSettingsPage() {
  const uid = await getSessionUid()
  if (!uid) redirect('/login')

  const profile = await getCurrentProfile(uid)
  if (!profile?.school_id) redirect('/login')

  const schoolDoc = await adminDb().collection('schools').doc(profile.school_id).get()
  const raw = schoolDoc.exists ? schoolDoc.data() : null
  const school = raw ? {
    name: raw.name as string | undefined,
    email: raw.email as string | undefined,
    phone: raw.phone as string | undefined,
    address: raw.address as string | undefined,
    subscription_status: raw.subscription_status as string | undefined,
    subscription_plan: raw.subscription_plan as string | undefined,
  } : null

  return (
    <SettingsPage
      schoolId={profile.school_id}
      school={school}
      profile={{
        full_name: profile.full_name ?? undefined,
        email: profile.email ?? undefined,
        phone: profile.phone ?? undefined,
        role: profile.role ?? undefined,
      }}
    />
  )
}
