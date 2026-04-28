import { redirect } from 'next/navigation'
import { getSessionUid } from '@/lib/firebase/session'
import { getCurrentProfile } from '@/lib/firebase/queries'
import { adminDb } from '@/lib/firebase/admin'
import ParentsPage from './parents-page'

export default async function SchoolAdminParentsPage() {
  const uid = await getSessionUid()
  if (!uid) redirect('/login')

  const profile = await getCurrentProfile(uid)
  if (!profile?.school_id) redirect('/login')

  const schoolId = profile.school_id

  const studentsSnap = await adminDb()
    .collection('students')
    .where('school_id', '==', schoolId)
    .get()

  if (studentsSnap.empty) {
    return <ParentsPage schoolId={schoolId} parents={[]} />
  }

  const studentIds = studentsSnap.docs.map(d => d.id)
  const studentNameById = new Map(
    studentsSnap.docs.map(d => [d.id, (d.data().full_name as string) ?? ''])
  )

  const chunks: string[][] = []
  for (let i = 0; i < studentIds.length; i += 30) {
    chunks.push(studentIds.slice(i, i + 30))
  }

  const linkSnaps = await Promise.all(
    chunks.map(chunk =>
      adminDb().collection('parent_student').where('student_id', 'in', chunk).get()
    )
  )
  const links = linkSnaps.flatMap(s => s.docs)

  if (links.length === 0) {
    return <ParentsPage schoolId={schoolId} parents={[]} />
  }

  const studentsByParent = new Map<
    string,
    { studentId: string; studentName: string; relationship: string }[]
  >()
  for (const link of links) {
    const parentId = (link.data().parent_id as string) ?? ''
    const studentId = (link.data().student_id as string) ?? ''
    if (!parentId) continue
    if (!studentsByParent.has(parentId)) studentsByParent.set(parentId, [])
    studentsByParent.get(parentId)!.push({
      studentId,
      studentName: studentNameById.get(studentId) ?? 'Unknown',
      relationship: (link.data().relationship as string) ?? '',
    })
  }

  const parentIds = [...studentsByParent.keys()]
  const parentDocs = await Promise.all(
    parentIds.map(id => adminDb().collection('users').doc(id).get())
  )

  const parents = parentDocs
    .filter(d => d.exists)
    .map(d => ({
      id: d.id,
      name: (d.data()!.full_name as string) ?? '',
      phone: (d.data()!.phone as string) ?? '',
      hasAuthAccount: d.data()!.has_auth_account === true,
      students: studentsByParent.get(d.id) ?? [],
    }))
    .sort((a, b) => a.name.localeCompare(b.name))

  return <ParentsPage schoolId={schoolId} parents={parents} />
}
