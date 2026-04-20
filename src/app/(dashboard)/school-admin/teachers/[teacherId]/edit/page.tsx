import { redirect } from 'next/navigation'
import { getSessionUid } from '@/lib/firebase/session'
import { getCurrentProfile } from '@/lib/firebase/queries'
import { getTeacherWithClasses } from '@/lib/actions/teachers'
import EditTeacherPage from './edit-teacher-page'

export default async function TeacherEditPage({
  params,
}: {
  params: Promise<{ teacherId: string }>
}) {
  const { teacherId } = await params

  const uid = await getSessionUid()
  if (!uid) redirect('/login')

  const profile = await getCurrentProfile(uid)
  if (!profile?.school_id) redirect('/login')

  const data = await getTeacherWithClasses(profile.school_id, teacherId)
  if (!data) redirect('/school-admin/teachers')

  const t = data.teacher
  const teacher = {
    full_name: t.full_name as string | undefined,
    email: t.email as string | undefined,
    phone: t.phone as string | undefined,
    subjects: t.subjects as string[] | undefined,
  }

  return (
    <EditTeacherPage
      teacherId={teacherId}
      teacher={teacher}
      allClasses={data.allClasses}
      assignedClassIds={data.assignedClassIds}
    />
  )
}
