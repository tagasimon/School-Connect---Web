import { redirect } from 'next/navigation'
import { getSessionUid } from '@/lib/firebase/session'
import { getCurrentProfile } from '@/lib/firebase/queries'
import { adminDb } from '@/lib/firebase/admin'
import AccountantFeesPage from './fees-page'

function serializeTimestamps<T extends Record<string, unknown>>(data: T): T {
  if (!data) return data
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value === 'object') {
      const v = value as any
      if ('_seconds' in v && typeof v._seconds === 'number') {
        result[key] = new Date(v._seconds * 1000).toISOString()
      } else if ('seconds' in v && typeof v.seconds === 'number') {
        result[key] = new Date(v.seconds * 1000).toISOString()
      } else if (typeof value === 'object') {
        result[key] = serializeTimestamps(value as Record<string, unknown>)
      } else {
        result[key] = value
      }
    } else {
      result[key] = value
    }
  }
  return result as T
}

export default async function AccountantFeesPageWrapper() {
  const uid = await getSessionUid()
  if (!uid) redirect('/login')

  const profile = await getCurrentProfile(uid)
  if (!profile?.school_id) redirect('/login')

  // Fetch classes and students in parallel to compute per-class counts
  const [classesSnap, studentsSnap] = await Promise.all([
    adminDb().collection('classes').where('school_id', '==', profile.school_id).get(),
    adminDb().collection('students').where('school_id', '==', profile.school_id).get(),
  ])

  const studentCounts = new Map<string, number>()
  for (const doc of studentsSnap.docs) {
    if ((doc.data() as any).status !== 'active') continue
    const cid = (doc.data() as any).class_id as string
    studentCounts.set(cid, (studentCounts.get(cid) ?? 0) + 1)
  }

  const classes = classesSnap.docs.map(doc => ({
    id: doc.id,
    name: (doc.data() as any).name as string,
    teacher_id: (doc.data() as any).teacher_id as string | null,
    studentCount: studentCounts.get(doc.id) ?? 0,
  }))

  return <AccountantFeesPage schoolId={profile.school_id} classes={classes as any} />
}
