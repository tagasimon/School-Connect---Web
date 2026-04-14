import { redirect } from 'next/navigation'
import { getSessionUid } from '@/lib/firebase/session'
import { getCurrentProfile } from '@/lib/firebase/queries'
import { adminDb } from '@/lib/firebase/admin'
import AccountantReportsPage from './reports-page'

function serializeTimestamps<T extends Record<string, unknown>>(data: T): T {
  if (!data) return data
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value === 'object') {
      const v = value as any
      if (typeof v.toDate === 'function') {
        result[key] = (v.toDate() as Date).toISOString()
      } else if ('_seconds' in v && typeof v._seconds === 'number') {
        result[key] = new Date(v._seconds * 1000).toISOString()
      } else if ('seconds' in v && typeof v.seconds === 'number') {
        result[key] = new Date(v.seconds * 1000).toISOString()
      } else {
        result[key] = serializeTimestamps(value as Record<string, unknown>)
      }
    } else {
      result[key] = value
    }
  }
  return result as T
}

export default async function AccountantReportsPageWrapper() {
  const uid = await getSessionUid()
  if (!uid) redirect('/login')

  const profile = await getCurrentProfile(uid)
  if (!profile?.school_id) redirect('/login')

  // Fetch all data needed for reports
  const [feesSnap, classesSnap, termsSnap, studentsSnap, paymentsSnap, schoolDoc] = await Promise.all([
    adminDb().collection('fees').where('school_id', '==', profile.school_id).get(),
    adminDb().collection('classes').where('school_id', '==', profile.school_id).get(),
    adminDb().collection('terms').where('school_id', '==', profile.school_id).get(),
    adminDb().collection('students').where('school_id', '==', profile.school_id).get(),
    adminDb().collection('payments').where('school_id', '==', profile.school_id).orderBy('created_at', 'desc').get(),
    adminDb().collection('schools').doc(profile.school_id).get(),
  ])

  const fees = feesSnap.docs.map(doc => ({ id: doc.id, ...serializeTimestamps(doc.data() as Record<string, unknown>) }))
  const classes = classesSnap.docs.map(doc => ({ id: doc.id, ...serializeTimestamps(doc.data() as Record<string, unknown>) }))
  const terms = termsSnap.docs.map(doc => ({ id: doc.id, ...serializeTimestamps(doc.data() as Record<string, unknown>) }))
  const students = studentsSnap.docs.map(doc => ({ id: doc.id, ...serializeTimestamps(doc.data() as Record<string, unknown>) }))
  const payments = paymentsSnap.docs.map(doc => ({ id: doc.id, ...serializeTimestamps(doc.data() as Record<string, unknown>) }))
  const schoolName = schoolDoc.exists ? ((schoolDoc.data() as any).name as string) : 'School'

  return (
    <AccountantReportsPage
      schoolId={profile.school_id}
      schoolName={schoolName}
      fees={fees}
      classes={classes}
      terms={terms}
      students={students}
      payments={payments}
    />
  )
}
