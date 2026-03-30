'use server'

import { redirect } from 'next/navigation'
import { getSessionUid } from '@/lib/firebase/session'
import { getCurrentProfile } from '@/lib/firebase/queries'
import { adminDb } from '@/lib/firebase/admin'
import { Timestamp } from 'firebase-admin/firestore'
import ManageSchoolPage from './manage-school-page'

// Helper to serialize Firestore Timestamps
function serializeTimestamps<T extends Record<string, unknown>>(data: T): T {
  if (!data) return data
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value === 'object') {
      if ('_seconds' in value && typeof (value as Timestamp).seconds === 'number') {
        result[key] = { _seconds: (value as Timestamp).seconds, _nanoseconds: (value as Timestamp).nanoseconds }
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

export default async function ManageSchoolWrapper({
  params,
}: {
  params: Promise<{ schoolId: string }>
}) {
  const { schoolId } = await params
  const uid = await getSessionUid()
  if (!uid) redirect('/login')

  const profile = await getCurrentProfile(uid)
  if (!profile) redirect('/login')

  // Verify user is super_admin
  if (profile.role !== 'super_admin') {
    redirect('/super-admin')
  }

  // Fetch school data
  const schoolDoc = await adminDb().collection('schools').doc(schoolId).get()
  if (!schoolDoc.exists) {
    redirect('/super-admin/schools')
  }

  const school = serializeTimestamps({ id: schoolDoc.id, ...schoolDoc.data() }) as any

  // Fetch counts
  const [studentsCount, teachersCount, classesCount, adminsSnap] = await Promise.all([
    adminDb().collection('students').where('school_id', '==', schoolId).count().get(),
    adminDb().collection('users').where('school_id', '==', schoolId).where('role', '==', 'teacher').count().get(),
    adminDb().collection('classes').where('school_id', '==', schoolId).count().get(),
    adminDb().collection('users').where('school_id', '==', schoolId).where('role', '==', 'school_admin').get(),
  ])

  const admins = adminsSnap.docs.map(doc => serializeTimestamps({ id: doc.id, ...doc.data() }) as any)

  return (
    <ManageSchoolPage
      school={school}
      stats={{
        students: studentsCount.data().count,
        teachers: teachersCount.data().count,
        classes: classesCount.data().count,
      }}
      admins={admins}
    />
  )
}
