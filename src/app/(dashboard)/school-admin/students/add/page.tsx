import { redirect } from 'next/navigation'
import { getSessionUid } from '@/lib/firebase/session'
import { getCurrentProfile } from '@/lib/firebase/queries'
import { adminDb } from '@/lib/firebase/admin'
import AddStudentPage from './add-student-page'

export default async function AddStudentPageWrapper() {
  const uid = await getSessionUid()
  if (!uid) redirect('/login')

  const profile = await getCurrentProfile(uid)
  if (!profile?.school_id) redirect('/login')

  const [classesSnap, commitmentsSnap] = await Promise.all([
    adminDb()
      .collection('classes')
      .where('school_id', '==', profile.school_id)
      .orderBy('name')
      .get(),
    adminDb()
      .collection('commitment_types')
      .where('school_id', '==', profile.school_id)
      .where('is_active', '==', true)
      .get(),
  ])

  const classes = classesSnap.docs.map(doc => ({
    id: doc.id,
    name: (doc.data() as any).name as string,
  }))

  const commitmentTypes = commitmentsSnap.docs.map(doc => ({
    id: doc.id,
    name: (doc.data() as any).name as string,
    default_amount: (doc.data() as any).default_amount as number,
  }))

  return (
    <AddStudentPage
      schoolId={profile.school_id}
      classes={classes}
      commitmentTypes={commitmentTypes}
    />
  )
}
