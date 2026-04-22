import { redirect } from 'next/navigation'
import { getSessionUid } from '@/lib/firebase/session'
import { getCurrentProfile } from '@/lib/firebase/queries'
import { getParentsForSchool } from '@/lib/actions/parents'
import ParentsPage from './parents-page'

export default async function SchoolAdminParentsPage() {
  const uid = await getSessionUid()
  if (!uid) redirect('/login')

  const profile = await getCurrentProfile(uid)
  if (!profile?.school_id) redirect('/login')

  const parents = await getParentsForSchool(profile.school_id)

  return <ParentsPage schoolId={profile.school_id} parents={parents} />
}
