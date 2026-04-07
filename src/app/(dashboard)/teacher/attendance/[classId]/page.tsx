import { redirect } from 'next/navigation'
import { getSessionUid } from '@/lib/firebase/session'
import { getCurrentProfile } from '@/lib/firebase/queries'
import { adminDb } from '@/lib/firebase/admin'
import AttendanceForm from './attendance-form'

export default async function AttendanceClassPage({
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

  const studentsSnap = await adminDb()
    .collection('students')
    .where('class_id', '==', classId)
    .get()

  const students = studentsSnap.docs
    .filter(d => (d.data().status as string) === 'active')
    .map(doc => ({
      id: doc.id,
      full_name: doc.data().full_name as string,
      student_number: doc.data().student_number as string | null,
    }))

  return (
    <AttendanceForm
      params={{ classId }}
      students={students}
      className={classDoc.data()?.name || 'Class'}
    />
  )
}
