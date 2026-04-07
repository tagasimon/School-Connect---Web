import { redirect } from 'next/navigation'
import { getSessionUid } from '@/lib/firebase/session'
import { getCurrentProfile } from '@/lib/firebase/queries'
import { adminDb } from '@/lib/firebase/admin'
import SchoolAdminReportsPage from './reports-page'

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

  const students = studentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  const classes = classesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  const fees = feesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  const attendance = attendanceSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  const announcements = announcementsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))

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
