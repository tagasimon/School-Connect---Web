import { redirect } from 'next/navigation'
import { getSessionUid } from '@/lib/firebase/session'
import { getCurrentProfile } from '@/lib/firebase/queries'
import { getParentWithStudents } from '@/lib/actions/parents'
import { adminDb } from '@/lib/firebase/admin'
import ParentDetailPage from './parent-detail-page'

export default async function ParentDetailPageWrapper({
  params,
}: {
  params: Promise<{ parentId: string }>
}) {
  const { parentId } = await params

  const uid = await getSessionUid()
  if (!uid) redirect('/login')

  const profile = await getCurrentProfile(uid)
  if (!profile?.school_id) redirect('/login')

  const schoolId = profile.school_id

  const [parent, studentsSnap, classesSnap] = await Promise.all([
    getParentWithStudents(parentId),
    adminDb()
      .collection('students')
      .where('school_id', '==', schoolId)
      .where('status', '==', 'active')
      .get(),
    adminDb()
      .collection('classes')
      .where('school_id', '==', schoolId)
      .get(),
  ])

  if (!parent) redirect('/school-admin/parents')

  const classNameById = new Map(
    classesSnap.docs.map(d => [d.id, (d.data().name as string) ?? ''])
  )

  const allStudents = studentsSnap.docs
    .map(d => ({
      id: d.id,
      name: (d.data().full_name as string) ?? '',
      classId: (d.data().class_id as string) ?? '',
      className: classNameById.get(d.data().class_id as string) ?? '',
    }))
    .sort((a, b) => a.name.localeCompare(b.name))

  const linkedStudentIds = new Set(parent.students.map(s => s.studentId))
  const unlinkableStudents = allStudents.filter(s => !linkedStudentIds.has(s.id))

  return (
    <ParentDetailPage
      parent={parent}
      unlinkableStudents={unlinkableStudents}
    />
  )
}
