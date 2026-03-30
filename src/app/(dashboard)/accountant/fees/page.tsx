import { redirect } from 'next/navigation'
import { getSessionUid } from '@/lib/firebase/session'
import { getCurrentProfile } from '@/lib/firebase/queries'
import { adminDb } from '@/lib/firebase/admin'
import FeesPage from './fees-page'
import { getFeesWithStudents, getStudentsWithoutFees } from '@/lib/actions/fees'

// Helper to serialize Firestore Timestamps
function serializeTimestamps<T extends Record<string, unknown>>(data: T): T {
  if (!data) return data
  
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value === 'object') {
      if ('_seconds' in value && typeof (value as any).seconds === 'number') {
        result[key] = { _seconds: (value as any).seconds, _nanoseconds: (value as any).nanoseconds }
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

export default async function AccountantFeesPage() {
  const uid = await getSessionUid()
  if (!uid) redirect('/login')

  const profile = await getCurrentProfile(uid)
  if (!profile?.school_id) redirect('/login')

  const [fees, termsSnap, currentTermSnap] = await Promise.all([
    getFeesWithStudents(profile.school_id),
    adminDb().collection('terms').where('school_id', '==', profile.school_id).get(),
    adminDb()
      .collection('terms')
      .where('school_id', '==', profile.school_id)
      .where('is_current', '==', true)
      .limit(1)
      .get(),
  ])

  const terms = termsSnap.docs.map(doc => serializeTimestamps({ id: doc.id, ...doc.data() }) as any)
  const currentTerm = currentTermSnap.empty ? null : serializeTimestamps(currentTermSnap.docs[0].data()) as any

  let students: Array<{ id: string; full_name: string; student_number?: string }> = []
  if (currentTerm && !currentTermSnap.empty) {
    const studentsWithoutFees = await getStudentsWithoutFees(
      profile.school_id,
      currentTermSnap.docs[0].id
    )
    students = studentsWithoutFees as Array<{ id: string; full_name: string; student_number?: string }>
  }

  return (
    <FeesPage
      schoolId={profile.school_id}
      initialFees={fees}
      students={students}
      terms={terms}
    />
  )
}
