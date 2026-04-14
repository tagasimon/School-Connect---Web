import { redirect } from 'next/navigation'
import { getSessionUid } from '@/lib/firebase/session'
import { getCurrentProfile } from '@/lib/firebase/queries'
import { adminDb } from '@/lib/firebase/admin'
import ManageClassPage from './manage-class-page'

export default async function ManageClassPageWrapper({
  params,
}: {
  params: Promise<{ classId: string }>
}) {
  const { classId } = await params
  const uid = await getSessionUid()
  if (!uid) redirect('/login')
  const profile = await getCurrentProfile(uid)
  if (!profile?.school_id) redirect('/login')

  const [classDoc, teachersSnap, studentsSnap] = await Promise.all([
    adminDb().collection('classes').doc(classId).get(),
    adminDb()
      .collection('users')
      .where('school_id', '==', profile.school_id)
      .where('role', '==', 'teacher')
      .get(),
    adminDb()
      .collection('students')
      .where('school_id', '==', profile.school_id)
      .where('class_id', '==', classId)
      .where('status', '==', 'active')
      .get(),
  ])

  if (!classDoc.exists) redirect('/school-admin/classes')

  const classData = classDoc.data()!
  const teachers = teachersSnap.docs.map(doc => ({
    id: doc.id,
    full_name: (doc.data() as any).full_name as string,
  }))

  const students = studentsSnap.docs.map(doc => ({
    id: doc.id,
    full_name: (doc.data() as any).full_name as string,
  }))

  return (
    <ManageClassPage
      schoolId={profile.school_id}
      classId={classId}
      className={classData.name as string}
      teacherId={classData.teacher_id as string | null}
      teachers={teachers}
      students={students}
    />
  )
}
