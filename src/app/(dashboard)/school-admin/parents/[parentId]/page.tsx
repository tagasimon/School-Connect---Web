import { redirect } from 'next/navigation'
import { getSessionUid } from '@/lib/firebase/session'
import { getCurrentProfile } from '@/lib/firebase/queries'
import { getParentWithStudents, getStudentsForSchool } from '@/lib/actions/parents'
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

  const [parent, allStudents] = await Promise.all([
    getParentWithStudents(parentId),
    getStudentsForSchool(profile.school_id),
  ])

  if (!parent) redirect('/school-admin/parents')

  const linkedStudentIds = new Set(parent.students.map(s => s.studentId))
  const unlinkableStudents = allStudents.filter(s => !linkedStudentIds.has(s.id))

  return (
    <ParentDetailPage
      parent={parent}
      unlinkableStudents={unlinkableStudents}
    />
  )
}
