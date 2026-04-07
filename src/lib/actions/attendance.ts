'use server'

import { adminDb, adminAuth } from '@/lib/firebase/admin'
import { Timestamp } from 'firebase-admin/firestore'
import { cookies } from 'next/headers'

export async function markAttendance(
  classId: string,
  attendanceData: Array<{ studentId: string; status: 'present' | 'absent'; notes?: string }>
): Promise<{ success: boolean; error?: string; count?: number }> {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')?.value
    if (!sessionCookie) {
      return { success: false, error: 'Not authenticated' }
    }

    const decoded = await adminAuth().verifySessionCookie(sessionCookie, true)

    const userDoc = await adminDb().collection('users').doc(decoded.uid).get()
    if (!userDoc.exists) {
      return { success: false, error: 'User not found' }
    }
    const schoolId = userDoc.data()?.school_id
    if (!schoolId) {
      return { success: false, error: 'School not found for this user' }
    }

    const today = new Date().toISOString().split('T')[0]
    const batch = adminDb().batch()

    for (const record of attendanceData) {
      const docRef = adminDb().collection('attendance').doc()
      batch.set(docRef, {
        student_id: record.studentId,
        class_id: classId,
        school_id: schoolId,
        date: today,
        status: record.status,
        marked_by: decoded.uid,
        notes: record.notes || null,
        sms_sent: record.status === 'absent',
        created_at: Timestamp.now(),
      })
    }

    await batch.commit()
    return { success: true, count: attendanceData.length }
  } catch (error) {
    console.error('[markAttendance] Error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
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
      .where('date', '==', today)
      .get()

    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  } catch {
    return null
  }
}
