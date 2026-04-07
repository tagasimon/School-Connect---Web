import { redirect } from 'next/navigation'
import { getSessionUid } from '@/lib/firebase/session'
import { getCurrentProfile } from '@/lib/firebase/queries'
import { adminDb } from '@/lib/firebase/admin'
import SchoolAdminReportsPage from './reports-page'

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

export default async function SchoolAdminReportsPageWrapper() {
  const uid = await getSessionUid()
  if (!uid) redirect('/login')

  const profile = await getCurrentProfile(uid)
  if (!profile?.school_id) redirect('/login')

  const [studentsSnap, classesSnap, feesSnap, attendanceSnap, announcementsSnap] = await Promise.all([
    adminDb().collection('students').where('school_id', '==', profile.school_id).get(),
    adminDb().collection('classes').where('school_id', '==', profile.school_id).get(),
    adminDb().collection('fees').where('school_id', '==', profile.school_id).get(),
    adminDb().collection('attendance').where('school_id', '==', profile.school_id).get(),
    adminDb().collection('announcements').where('school_id', '==', profile.school_id).get(),
  ])

  const students = studentsSnap.docs.map(doc => serializeTimestamps({ id: doc.id, ...doc.data() } as any))
  const classes = classesSnap.docs.map(doc => serializeTimestamps({ id: doc.id, ...doc.data() } as any))
  const fees = feesSnap.docs.map(doc => serializeTimestamps({ id: doc.id, ...doc.data() } as any))
  const attendance = attendanceSnap.docs.map(doc => serializeTimestamps({ id: doc.id, ...doc.data() } as any))
  const announcements = announcementsSnap.docs.map(doc => serializeTimestamps({ id: doc.id, ...doc.data() } as any))

  return (
    <SchoolAdminReportsPage
      schoolName={(profile as any).school_name || 'School'}
      students={students}
      classes={classes}
      fees={fees}
      attendance={attendance}
      announcements={announcements}
    />
  )
}
