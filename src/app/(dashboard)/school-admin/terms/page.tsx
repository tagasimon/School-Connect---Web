import { redirect } from 'next/navigation'
import { getSessionUid } from '@/lib/firebase/session'
import { getCurrentProfile } from '@/lib/firebase/queries'
import { adminDb } from '@/lib/firebase/admin'
import TermsPage from './terms-page'

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

export default async function SchoolAdminTermsPage() {
  const uid = await getSessionUid()
  if (!uid) redirect('/login')

  const profile = await getCurrentProfile(uid)
  if (!profile?.school_id) redirect('/login')

  const termsSnap = await adminDb()
    .collection('terms')
    .where('school_id', '==', profile.school_id)
    .get()

  const terms = termsSnap.docs.map(doc => serializeTimestamps({ id: doc.id, ...doc.data() } as Record<string, unknown>))

  return <TermsPage terms={terms as any} schoolId={profile.school_id} />
}
