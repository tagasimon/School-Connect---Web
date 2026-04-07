import { redirect } from 'next/navigation'
import { getSessionUid } from '@/lib/firebase/session'
import { getCurrentProfile } from '@/lib/firebase/queries'
import { adminDb } from '@/lib/firebase/admin'
import ImportStudentsPage from './import-students-page'

export default async function ImportStudentsPageWrapper() {
  const uid = await getSessionUid()
  if (!uid) redirect('/login')

  const profile = await getCurrentProfile(uid)
  if (!profile?.school_id) redirect('/login')

  const classesSnap = await adminDb()
    .collection('classes')
    .where('school_id', '==', profile.school_id)
    .orderBy('name')
    .get()

  const classes = classesSnap.docs.map(doc => ({
    id: doc.id,
    name: (doc.data() as any).name as string,
  }))

  return <ImportStudentsPage schoolId={profile.school_id} classes={classes} />
}
