import { redirect } from 'next/navigation'
import { getSessionUid } from '@/lib/firebase/session'
import { getCurrentProfile } from '@/lib/firebase/queries'
import { adminDb } from '@/lib/firebase/admin'
import AttendanceTabs from './attendance-tabs'

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
  if (!classDoc.exists) redirect('/teacher/attendance')

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
    <AttendanceTabs
      classId={classId}
      className={classDoc.data()?.name as string || 'Class'}
      students={students}
    />
  )
}
