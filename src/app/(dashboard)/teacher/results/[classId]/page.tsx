import { redirect } from 'next/navigation'
import { getSessionUid } from '@/lib/firebase/session'
import { getCurrentProfile } from '@/lib/firebase/queries'
import { adminDb } from '@/lib/firebase/admin'
import ResultsForm from './results-form'
import { getCurrentTerm, getSubjectsForClass } from '@/lib/actions/results'

export default async function ResultsClassPage({
  params,
}: {
  params: Promise<{ classId: string }>
}) {
  const { classId } = await params
  const uid = await getSessionUid()
  if (!uid) redirect('/login')

  const profile = await getCurrentProfile(uid)
  if (!profile?.school_id) redirect('/login')

  const classDoc = await adminDb().collection('classes').doc(classId).get()
  if (!classDoc.exists) redirect('/teacher')

  const [term, subjectsSnap, studentsSnap] = await Promise.all([
    getCurrentTerm(profile.school_id),
    getSubjectsForClass(classId),
    adminDb()
      .collection('students')
      .where('class_id', '==', classId)
      .where('status', '==', 'active')
      .orderBy('full_name')
      .get(),
  ])

  if (!term) {
    redirect('/teacher')
  }

  const students = studentsSnap.docs.map(doc => ({
    id: doc.id,
    full_name: doc.data().full_name,
    student_number: doc.data().student_number,
  }))

  return (
    <ResultsForm
      params={{ classId }}
      students={students}
      subjects={subjectsSnap}
      termId={term.id}
      className={classDoc.data()?.name || 'Class'}
    />
  )
}
