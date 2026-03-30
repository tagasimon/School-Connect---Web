'use server'

import { adminDb, adminAuth } from '@/lib/firebase/admin'
import { Timestamp } from 'firebase-admin/firestore'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function uploadResults(
  classId: string,
  termId: string,
  resultsData: Array<{
    studentId: string
    subjectId: string
    marksObtained: number
    marksTotal: number
  }>
) {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')?.value
  if (!sessionCookie) redirect('/login')

  const decoded = await adminAuth().verifySessionCookie(sessionCookie, true)
  const schoolId = await getSchoolId(decoded.uid)
  if (!schoolId) throw new Error('School not found')

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

  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
}

async function getSchoolId(uid: string): Promise<string | null> {
  const doc = await adminDb().collection('users').doc(uid).get()
  if (!doc.exists) return null
  return doc.data()?.school_id || null
}
