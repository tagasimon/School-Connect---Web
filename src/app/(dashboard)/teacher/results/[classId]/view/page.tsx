import { redirect } from 'next/navigation'
import { getSessionUid } from '@/lib/firebase/session'
import { getCurrentProfile } from '@/lib/firebase/queries'
import { adminDb } from '@/lib/firebase/admin'
import { getAllTerms, getClassResultsForTerm } from '@/lib/actions/results'
import ViewResultsPage from './view-results-page'

export default async function TeacherViewResultsPage({
  params,
}: {
  params: Promise<{ classId: string }>
}) {
  const { classId } = await params

  const uid = await getSessionUid()
  if (!uid) redirect('/login')

  const profile = await getCurrentProfile(uid)
  if (!profile?.school_id) redirect('/login')

  const [classDoc, schoolDoc] = await Promise.all([
    adminDb().collection('classes').doc(classId).get(),
    adminDb().collection('schools').doc(profile.school_id).get(),
  ])
  if (!classDoc.exists) redirect('/teacher/results')

  const terms = await getAllTerms(profile.school_id)
  const currentTerm = terms.find(t => t.is_current) ?? terms[0]

  const initialData = currentTerm
    ? await getClassResultsForTerm(classId, currentTerm.id)
    : { subjects: [], students: [] }

  return (
    <ViewResultsPage
      classId={classId}
      className={(classDoc.data()?.name as string) || 'Class'}
      schoolName={(schoolDoc.data()?.name as string) ?? 'School'}
      terms={terms}
      initialTermId={currentTerm?.id ?? ''}
      initialData={initialData}
    />
  )
}
