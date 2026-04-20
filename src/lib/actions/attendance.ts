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

export async function getAttendanceForMonth(classId: string, year: number, month: number) {
  const pad = (n: number) => String(n).padStart(2, '0')
  const monthStr = `${year}-${pad(month)}`
  const daysInMonth = new Date(year, month, 0).getDate()

  const [studentsSnap, attendanceSnap] = await Promise.all([
    adminDb().collection('students').where('class_id', '==', classId).where('status', '==', 'active').get(),
    adminDb()
      .collection('attendance')
      .where('class_id', '==', classId)
      .where('date', '>=', `${monthStr}-01`)
      .where('date', '<=', `${monthStr}-${pad(daysInMonth)}`)
      .get(),
  ])

  const attendanceMap: Record<string, Record<number, 'present' | 'absent'>> = {}
  for (const doc of attendanceSnap.docs) {
    const d = doc.data()
    const studentId = d.student_id as string
    const day = parseInt((d.date as string).split('-')[2], 10)
    if (!attendanceMap[studentId]) attendanceMap[studentId] = {}
    attendanceMap[studentId][day] = d.status as 'present' | 'absent'
  }

  const students = studentsSnap.docs
    .map(doc => ({
      student_id: doc.id,
      full_name: doc.data().full_name as string,
      student_number: doc.data().student_number as string | null,
      days: attendanceMap[doc.id] ?? {} as Record<number, 'present' | 'absent'>,
    }))
    .sort((a, b) => a.full_name.localeCompare(b.full_name))

  return { students, daysInMonth }
}

export async function getAttendanceForDate(classId: string, date: string) {
  const [attendanceSnap, studentsSnap] = await Promise.all([
    adminDb().collection('attendance').where('class_id', '==', classId).where('date', '==', date).get(),
    adminDb().collection('students').where('class_id', '==', classId).where('status', '==', 'active').get(),
  ])

  const attendanceMap: Record<string, { status: string; notes: string | null }> = {}
  for (const doc of attendanceSnap.docs) {
    const d = doc.data()
    attendanceMap[d.student_id as string] = {
      status: d.status as string,
      notes: d.notes as string | null,
    }
  }

  return studentsSnap.docs
    .map(doc => ({
      student_id: doc.id,
      full_name: doc.data().full_name as string,
      student_number: doc.data().student_number as string | null,
      status: attendanceMap[doc.id]?.status ?? null,
      notes: attendanceMap[doc.id]?.notes ?? null,
    }))
    .sort((a, b) => a.full_name.localeCompare(b.full_name))
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
