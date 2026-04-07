'use server'

import { adminDb, adminAuth } from '@/lib/firebase/admin'
import { Timestamp } from 'firebase-admin/firestore'
import { cookies } from 'next/headers'

// Helper to serialize Firestore Timestamps
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

export async function uploadResults(
  classId: string,
  termId: string,
  resultsData: Array<{
    studentId: string
    subjectId: string
    marksObtained: number
    marksTotal: number
  }>
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

    const batch = adminDb().batch()

    for (const result of resultsData) {
      const percentage = (result.marksObtained / result.marksTotal) * 100
      let grade = 'F9'
      if (percentage >= 80) grade = 'D1'
      else if (percentage >= 70) grade = 'D2'
      else if (percentage >= 60) grade = 'C3'
      else if (percentage >= 55) grade = 'C4'
      else if (percentage >= 50) grade = 'C5'
      else if (percentage >= 45) grade = 'C6'
      else if (percentage >= 40) grade = 'P7'
      else if (percentage >= 35) grade = 'P8'

      let remarks = 'Needs improvement'
      if (percentage >= 70) remarks = 'Excellent performance'
      else if (percentage >= 50) remarks = 'Good effort'

      const docRef = adminDb().collection('results').doc()
      batch.set(docRef, {
        student_id: result.studentId,
        class_id: classId,
        school_id: schoolId,
        subject_id: result.subjectId,
        term_id: termId,
        marks_obtained: result.marksObtained,
        marks_total: result.marksTotal,
        grade,
        remarks,
        created_by: decoded.uid,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
      })
    }

    await batch.commit()
    return { success: true, count: resultsData.length }
  } catch (error) {
    console.error('[uploadResults] Error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function getCurrentTerm(schoolId: string) {
  const snap = await adminDb()
    .collection('terms')
    .where('school_id', '==', schoolId)
    .where('is_current', '==', true)
    .limit(1)
    .get()

  if (snap.empty) return null
  const doc = snap.docs[0]
  return { id: doc.id, ...doc.data() }
}

export async function getSubjectsForClass(classId: string) {
  const snap = await adminDb()
    .collection('subjects')
    .where('class_id', '==', classId)
    .get()

  return snap.docs.map(doc => serializeTimestamps({ id: doc.id, ...doc.data() }) as any)
}
