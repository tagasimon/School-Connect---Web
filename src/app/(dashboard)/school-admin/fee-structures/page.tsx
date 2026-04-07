import { redirect } from 'next/navigation'
import { getSessionUid } from '@/lib/firebase/session'
import { getCurrentProfile } from '@/lib/firebase/queries'
import { adminDb } from '@/lib/firebase/admin'
import FeeStructuresPage from './fee-structures-page'

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

export default async function SchoolAdminFeeStructuresPage() {
  const uid = await getSessionUid()
  if (!uid) redirect('/login')

  const profile = await getCurrentProfile(uid)
  if (!profile?.school_id) redirect('/login')

  const [classesSnap, termsSnap, feeStructuresSnap] = await Promise.all([
    adminDb()
      .collection('classes')
      .where('school_id', '==', profile.school_id)
      .get(),
    adminDb()
      .collection('terms')
      .where('school_id', '==', profile.school_id)
      .orderBy('year', 'desc')
      .get(),
    adminDb()
      .collection('fee_structures')
      .where('school_id', '==', profile.school_id)
      .get(),
  ])

  const classes = classesSnap.docs.map(doc => ({
    id: doc.id,
    ...serializeTimestamps(doc.data() as Record<string, unknown>),
  }))

  const terms = termsSnap.docs.map(doc => ({
    id: doc.id,
    ...serializeTimestamps(doc.data() as Record<string, unknown>),
  }))

  // Enrich fee structures with class and term data
  const feeStructures = await Promise.all(
    feeStructuresSnap.docs.map(async (doc) => {
      const data = doc.data()
      const [classDoc, termDoc] = await Promise.all([
        adminDb().collection('classes').doc(data.class_id).get(),
        adminDb().collection('terms').doc(data.term_id).get(),
      ])

      return {
        id: doc.id,
        ...serializeTimestamps(data as Record<string, unknown>),
        className: classDoc.exists ? ((classDoc.data() as any).name as string) : 'Unknown',
        termName: termDoc.exists ? `${(termDoc.data() as any).name} ${(termDoc.data() as any).year}` : 'Unknown',
      }
    })
  )

  return (
    <FeeStructuresPage
      schoolId={profile.school_id}
      classes={classes as any}
      terms={terms as any}
      feeStructures={feeStructures as any}
    />
  )
}
