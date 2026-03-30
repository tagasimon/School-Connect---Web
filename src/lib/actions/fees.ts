'use server'

import { adminDb, adminAuth } from '@/lib/firebase/admin'
import { Timestamp } from 'firebase-admin/firestore'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

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

export async function updateFeePayment(
  feeId: string,
  amountPaid: number,
  notes?: string
) {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')?.value
  if (!sessionCookie) redirect('/login')

  const decoded = await adminAuth().verifySessionCookie(sessionCookie, true)

  const feeRef = adminDb().collection('fees').doc(feeId)
  const feeDoc = await feeRef.get()
  
  if (!feeDoc.exists) {
    throw new Error('Fee record not found')
  }

  const currentData = feeDoc.data()
  const newAmountPaid = (currentData?.amount_paid as number) || 0 + amountPaid

  await feeRef.update({
    amount_paid: newAmountPaid,
    notes: notes || currentData?.notes || '',
    updated_at: Timestamp.now(),
  })

  return { success: true, newAmountPaid }
}

export async function getFeesWithStudents(schoolId: string) {
  const feesSnap = await adminDb()
    .collection('fees')
    .where('school_id', '==', schoolId)
    .get()

  const fees = await Promise.all(
    feesSnap.docs.map(async (doc) => {
      const feeData = doc.data()
      const [studentDoc, termDoc] = await Promise.all([
        adminDb().collection('students').doc(feeData.student_id).get(),
        adminDb().collection('terms').doc(feeData.term_id).get(),
      ])

      return serializeTimestamps({
        id: doc.id,
        ...feeData,
        student: studentDoc.exists ? { id: studentDoc.id, ...studentDoc.data() } : null,
        term: termDoc.exists ? { id: termDoc.id, ...termDoc.data() } : null,
      } as any)
    })
  )

  return fees
}

export async function getStudentsWithoutFees(schoolId: string, termId: string) {
  const [studentsSnap, feesSnap] = await Promise.all([
    adminDb()
      .collection('students')
      .where('school_id', '==', schoolId)
      .where('status', '==', 'active')
      .get(),
    adminDb()
      .collection('fees')
      .where('school_id', '==', schoolId)
      .where('term_id', '==', termId)
      .get(),
  ])

  const studentsWithFees = new Set(feesSnap.docs.map(d => d.data().student_id))
  return studentsSnap.docs
    .filter(doc => !studentsWithFees.has(doc.id))
    .map(doc => ({ id: doc.id, ...doc.data() }))
}

export async function createFeeRecord(
  schoolId: string,
  data: {
    studentId: string
    termId: string
    totalAmount: number
    notes?: string
  }
) {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')?.value
  if (!sessionCookie) redirect('/login')

  const decoded = await adminAuth().verifySessionCookie(sessionCookie, true)

  // Check if fee already exists for this student and term
  const existingSnap = await adminDb()
    .collection('fees')
    .where('school_id', '==', schoolId)
    .where('student_id', '==', data.studentId)
    .where('term_id', '==', data.termId)
    .limit(1)
    .get()

  if (!existingSnap.empty) {
    return { error: 'Fee record already exists for this student in this term' }
  }

  const docRef = adminDb().collection('fees').doc()
  await docRef.set({
    student_id: data.studentId,
    school_id: schoolId,
    term_id: data.termId,
    total_amount: data.totalAmount,
    amount_paid: 0,
    notes: data.notes || '',
    created_by: decoded.uid,
    created_at: Timestamp.now(),
    updated_at: Timestamp.now(),
  })

  return { success: true, id: docRef.id }
}
