'use server'

import { adminDb, adminAuth } from '@/lib/firebase/admin'
import { Timestamp } from 'firebase-admin/firestore'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function markAttendance(
  classId: string,
  attendanceData: Array<{ studentId: string; status: 'present' | 'absent'; notes?: string }>
) {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')?.value
  if (!sessionCookie) redirect('/login')

  const decoded = await adminAuth().verifySessionCookie(sessionCookie, true)
  const schoolId = await getSchoolId(decoded.uid)
  if (!schoolId) throw new Error('School not found')

  const today = new Date().toISOString().split('T')[0]
  const batch = adminDb().batch()

  for (const record of attendanceData) {
    const docRef = adminDb().collection('attendance').doc()
    batch.set(docRef, {
      student_id: record.studentId,
      class_id: classId,
      school_id: schoolId,
      date: Timestamp.fromDate(new Date(today)),
      status: record.status,
      marked_by: decoded.uid,
      notes: record.notes || null,
      sms_sent: record.status === 'absent',
      created_at: Timestamp.now(),
    })
  }

  await batch.commit()
}

export async function getTodayAttendance(classId: string) {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')?.value
  if (!sessionCookie) return null

  try {
    const decoded = await adminAuth().verifySessionCookie(sessionCookie, true)
    const today = new Date().toISOString().split('T')[0]
    
    const snap = await adminDb()
      .collection('attendance')
      .where('class_id', '==', classId)
      .where('date', '==', Timestamp.fromDate(new Date(today)))
      .get()

    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  } catch {
    return null
  }
}

async function getSchoolId(uid: string): Promise<string | null> {
  const doc = await adminDb().collection('users').doc(uid).get()
  if (!doc.exists) return null
  return doc.data()?.school_id || null
}
