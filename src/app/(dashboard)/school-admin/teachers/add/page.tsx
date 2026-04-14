import { redirect } from 'next/navigation'
import { getSessionUid } from '@/lib/firebase/session'
import { getCurrentProfile } from '@/lib/firebase/queries'
import AddTeacherPage from './add-teacher-page'

export default async function AddTeacherPageWrapper() {
  const uid = await getSessionUid()
  if (!uid) redirect('/login')
  const profile = await getCurrentProfile(uid)
  if (!profile?.school_id) redirect('/login')

  return <AddTeacherPage schoolId={profile.school_id} />
}
