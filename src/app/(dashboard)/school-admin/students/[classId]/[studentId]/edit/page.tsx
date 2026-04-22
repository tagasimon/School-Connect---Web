import { redirect } from 'next/navigation'
import { getSessionUid } from '@/lib/firebase/session'
import { getCurrentProfile } from '@/lib/firebase/queries'
import { adminDb } from '@/lib/firebase/admin'
import { getStudentForEdit } from '@/lib/actions/students'
import EditStudentPage from './edit-student-page'

export default async function StudentEditPage({
  params,
}: {
  params: Promise<{ classId: string; studentId: string }>
}) {
  const { classId, studentId } = await params

  const uid = await getSessionUid()
  if (!uid) redirect('/login')

  const profile = await getCurrentProfile(uid)
  if (!profile?.school_id) redirect('/login')

  const [data, classesSnap] = await Promise.all([
    getStudentForEdit(studentId),
    adminDb().collection('classes').where('school_id', '==', profile.school_id).get(),
  ])

  if (!data) redirect(`/school-admin/students/${classId}`)

  const allClasses = classesSnap.docs.map(d => ({ id: d.id, name: d.data().name as string }))

  const s = data.student
  const student = {
    full_name: s.full_name as string | undefined,
    student_number: s.student_number as string | undefined,
    gender: s.gender as string | undefined,
    date_of_birth: s.date_of_birth as string | undefined,
    class_id: s.class_id as string | undefined,
  }

  return (
    <EditStudentPage
      classId={classId}
      studentId={studentId}
      schoolId={profile.school_id}
      student={student}
      parent={data.parent}
      allClasses={allClasses}
    />
  )
}
