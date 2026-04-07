import { redirect } from 'next/navigation'
import { getSessionUid } from '@/lib/firebase/session'
import { getCurrentProfile } from '@/lib/firebase/queries'
import { getStudentsByClass } from '@/lib/actions/students'
import ClassStudentsPage from './class-students-page'

export default async function ClassStudentsPageWrapper({
  params,
}: {
  params: Promise<{ classId: string }>
}) {
  const uid = await getSessionUid()
  if (!uid) redirect('/login')

  const profile = await getCurrentProfile(uid)
  if (!profile?.school_id) redirect('/login')

  const { classId } = await params

  const students = await getStudentsByClass(profile.school_id, classId)

  // Get class name
  const { adminDb } = await import('@/lib/firebase/admin')
  const classDoc = await adminDb().collection('classes').doc(classId).get()
  const className = classDoc.exists ? ((classDoc.data() as any).name as string) : 'Unknown'

  return (
    <ClassStudentsPage
      schoolId={profile.school_id}
      classId={classId}
      className={className}
      students={students as any}
    />
  )
}
