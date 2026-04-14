import { redirect } from 'next/navigation'
import { getSessionUid } from '@/lib/firebase/session'
import { getCurrentProfile } from '@/lib/firebase/queries'
import { adminDb } from '@/lib/firebase/admin'
import CreateClassPage from './create-class-page'

export default async function CreateClassPageWrapper() {
  const uid = await getSessionUid()
  if (!uid) redirect('/login')
  const profile = await getCurrentProfile(uid)
  if (!profile?.school_id) redirect('/login')

  const [teachersSnap, termsSnap] = await Promise.all([
    adminDb()
      .collection('users')
      .where('school_id', '==', profile.school_id)
      .where('role', '==', 'teacher')
      .get(),
    adminDb()
      .collection('terms')
      .where('school_id', '==', profile.school_id)
      .get(),
  ])

  const teachers = teachersSnap.docs.map(doc => ({
    id: doc.id,
    full_name: (doc.data() as any).full_name as string,
  }))

  const terms = termsSnap.docs.map(doc => ({
    id: doc.id,
    name: (doc.data() as any).name as string,
    year: (doc.data() as any).year as number,
    is_current: (doc.data() as any).is_current as boolean,
  }))

  return <CreateClassPage schoolId={profile.school_id} teachers={teachers} terms={terms} />
}
