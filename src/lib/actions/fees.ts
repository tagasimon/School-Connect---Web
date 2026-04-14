'use server'

import { adminDb, adminAuth } from '@/lib/firebase/admin'
import { Timestamp } from 'firebase-admin/firestore'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

// ── Helpers ────────────────────────────────────────────────────────────────

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

async function verifySession() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')?.value
  if (!sessionCookie) redirect('/login')
  return adminAuth().verifySessionCookie(sessionCookie, true)
}

// ── Fee Structures ─────────────────────────────────────────────────────────

export async function createFeeStructure(
  schoolId: string,
  data: {
    classId: string
    termId: string
    amount: number
    paymentDeadline?: string  // ISO date
    notes?: string
  }
) {
  const decoded = await verifySession()

  // Check for duplicate
  const existingSnap = await adminDb()
    .collection('fee_structures')
    .where('school_id', '==', schoolId)
    .where('class_id', '==', data.classId)
    .where('term_id', '==', data.termId)
    .limit(1)
    .get()

  if (!existingSnap.empty) {
    return { error: 'Fee structure already exists for this class and term' }
  }

  const docRef = adminDb().collection('fee_structures').doc()
  await docRef.set({
    school_id: schoolId,
    class_id: data.classId,
    term_id: data.termId,
    amount: data.amount,
    payment_deadline: data.paymentDeadline || null,
    notes: data.notes || null,
    created_by: decoded.uid,
    created_at: Timestamp.now(),
    updated_at: Timestamp.now(),
  })

  // Auto-generate fee records for all active students in the class
  const studentsSnap = await adminDb()
    .collection('students')
    .where('school_id', '==', schoolId)
    .where('class_id', '==', data.classId)
    .where('status', '==', 'active')
    .get()

  let created = 0
  let skipped = 0

  // Batch writes for performance
  const batch = adminDb().batch()
  for (const studentDoc of studentsSnap.docs) {
    const studentId = studentDoc.id
    const existingSnap = await adminDb()
      .collection('fees')
      .where('school_id', '==', schoolId)
      .where('student_id', '==', studentId)
      .where('term_id', '==', data.termId)
      .limit(1)
      .get()

    if (!existingSnap.empty) {
      skipped++
      continue
    }

    const feeRef = adminDb().collection('fees').doc()
    batch.set(feeRef, {
      student_id: studentId,
      school_id: schoolId,
      term_id: data.termId,
      total_amount: data.amount,
      amount_paid: 0,
      notes: null,
      created_by: decoded.uid,
      created_at: Timestamp.now(),
      updated_at: Timestamp.now(),
    })
    created++
  }
  await batch.commit()

  return { success: true, id: docRef.id, created, skipped }
}

export async function getFeeStructuresBySchool(schoolId: string) {
  const snap = await adminDb()
    .collection('fee_structures')
    .where('school_id', '==', schoolId)
    .orderBy('created_at', 'desc')
    .get()

  const structures = await Promise.all(
    snap.docs.map(async (doc) => {
      const data = doc.data()
      const [classDoc, termDoc] = await Promise.all([
        adminDb().collection('classes').doc(data.class_id).get(),
        adminDb().collection('terms').doc(data.term_id).get(),
      ])

      return serializeTimestamps({
        id: doc.id,
        ...data,
        class: classDoc.exists ? { id: classDoc.id, ...classDoc.data() } : null,
        term: termDoc.exists ? { id: termDoc.id, ...termDoc.data() } : null,
      } as any)
    })
  )

  return structures
}

// ── Auto-generate fee records from fee structures ──────────────────────────

export async function autoGenerateFeeRecords(
  schoolId: string,
  feeStructureId: string
) {
  const decoded = await verifySession()

  const structureRef = adminDb().collection('fee_structures').doc(feeStructureId)
  const structureDoc = await structureRef.get()

  if (!structureDoc.exists) {
    return { error: 'Fee structure not found' }
  }

  const structure = structureDoc.data()!
  const classId = structure.class_id as string
  const termId = structure.term_id as string
  const amount = structure.amount as number

  // Get all active students in the class
  const studentsSnap = await adminDb()
    .collection('students')
    .where('school_id', '==', schoolId)
    .where('class_id', '==', classId)
    .where('status', '==', 'active')
    .get()

  let created = 0
  let skipped = 0

  for (const studentDoc of studentsSnap.docs) {
    const studentId = studentDoc.id

    // Check if fee record already exists
    const existingSnap = await adminDb()
      .collection('fees')
      .where('school_id', '==', schoolId)
      .where('student_id', '==', studentId)
      .where('term_id', '==', termId)
      .limit(1)
      .get()

    if (!existingSnap.empty) {
      skipped++
      continue
    }

    const feeRef = adminDb().collection('fees').doc()
    await feeRef.set({
      student_id: studentId,
      school_id: schoolId,
      term_id: termId,
      total_amount: amount,
      amount_paid: 0,
      notes: null,
      created_by: decoded.uid,
      created_at: Timestamp.now(),
      updated_at: Timestamp.now(),
    })
    created++
  }

  return { success: true, created, skipped }
}

// ── Fee Records ────────────────────────────────────────────────────────────

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

export async function getFeesByClass(schoolId: string, classId: string) {
  // Fetch students and current term in parallel
  const [studentsSnap, termSnap] = await Promise.all([
    adminDb()
      .collection('students')
      .where('school_id', '==', schoolId)
      .where('class_id', '==', classId)
      .get(),
    adminDb()
      .collection('terms')
      .where('school_id', '==', schoolId)
      .where('is_current', '==', true)
      .limit(1)
      .get(),
  ])

  const students = studentsSnap.docs
    .filter(d => (d.data().status as string) === 'active')
    .sort((a, b) => {
      const nameA = (a.data().full_name as string) || ''
      const nameB = (b.data().full_name as string) || ''
      return nameA.localeCompare(nameB)
    })
    .map(d => serializeTimestamps({ id: d.id, ...d.data() } as any))

  const currentTerm = termSnap.empty ? null : serializeTimestamps({ id: termSnap.docs[0].id, ...termSnap.docs[0].data() } as any)

  const fees: Record<string, any> = {}

  if (students.length > 0 && currentTerm) {
    // Batch fetch all fees in one round trip using `in` (max 30 per query)
    const studentIds = students.map((s: any) => s.id)
    const chunks: string[][] = []
    for (let i = 0; i < studentIds.length; i += 30) {
      chunks.push(studentIds.slice(i, i + 30))
    }

    const feeSnaps = await Promise.all(
      chunks.map(chunk =>
        adminDb()
          .collection('fees')
          .where('school_id', '==', schoolId)
          .where('term_id', '==', currentTerm.id)
          .where('student_id', 'in', chunk)
          .get()
      )
    )

    for (const snap of feeSnaps) {
      for (const doc of snap.docs) {
        const data = doc.data()
        fees[data.student_id as string] = serializeTimestamps({ id: doc.id, ...data } as any)
      }
    }
  }

  return {
    students,
    currentTerm,
    fees,
  }
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
  const decoded = await verifySession()

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

// ── Payments ───────────────────────────────────────────────────────────────

export async function recordPayment(
  schoolId: string,
  data: {
    feeId: string
    studentId: string
    amount: number
    receiptNumber: string
    paymentDate?: string  // ISO date, defaults to today
    notes?: string
  }
) {
  const decoded = await verifySession()

  // Get existing fee
  const feeRef = adminDb().collection('fees').doc(data.feeId)
  const feeDoc = await feeRef.get()

  if (!feeDoc.exists) {
    return { error: 'Fee record not found' }
  }

  const feeData = feeDoc.data()
  const currentPaid = feeData?.amount_paid as number ?? 0
  const totalAmount = feeData?.total_amount as number ?? 0
  const newAmountPaid = currentPaid + data.amount

  if (newAmountPaid > totalAmount) {
    return { error: `Payment exceeds balance. Remaining balance: UGX ${(totalAmount - currentPaid).toLocaleString()}` }
  }

  // Check for duplicate receipt number
  const existingReceiptSnap = await adminDb()
    .collection('payments')
    .where('school_id', '==', schoolId)
    .where('receipt_number', '==', data.receiptNumber)
    .limit(1)
    .get()

  if (!existingReceiptSnap.empty) {
    return { error: `Receipt number "${data.receiptNumber}" already exists` }
  }

  // Create payment record
  const paymentRef = adminDb().collection('payments').doc()
  await paymentRef.set({
    fee_id: data.feeId,
    student_id: data.studentId,
    school_id: schoolId,
    amount: data.amount,
    receipt_number: data.receiptNumber,
    payment_date: data.paymentDate || new Date().toISOString().split('T')[0],
    notes: data.notes || null,
    created_by: decoded.uid,
    created_at: Timestamp.now(),
  })

  // Update fee amount_paid
  await feeRef.update({
    amount_paid: newAmountPaid,
    updated_at: Timestamp.now(),
  })

  return { success: true, paymentId: paymentRef.id, newAmountPaid, balance: totalAmount - newAmountPaid }
}

export async function getPaymentsByClass(schoolId: string, classId: string) {
  // Get students in class
  const studentsSnap = await adminDb()
    .collection('students')
    .where('school_id', '==', schoolId)
    .where('class_id', '==', classId)
    .where('status', '==', 'active')
    .orderBy('full_name')
    .get()

  const results = await Promise.all(
    studentsSnap.docs.map(async (studentDoc) => {
      const studentData = studentDoc.data()
      const studentId = studentDoc.id

      // Get fee record
      const feeSnap = await adminDb()
        .collection('fees')
        .where('school_id', '==', schoolId)
        .where('student_id', '==', studentId)
        .limit(1)
        .get()

      if (feeSnap.empty) {
        return {
          student: { id: studentId, ...studentData },
          fee: null,
          payments: [],
        }
      }

      const feeData = feeSnap.docs[0].data()
      const feeId = feeSnap.docs[0].id

      // Get payments
      const paymentsSnap = await adminDb()
        .collection('payments')
        .where('fee_id', '==', feeId)
        .orderBy('created_at', 'desc')
        .get()

      const payments = paymentsSnap.docs.map(d => serializeTimestamps({ id: d.id, ...d.data() } as any))

      return serializeTimestamps({
        student: { id: studentId, ...studentData },
        fee: { id: feeId, ...feeData },
        payments,
      } as any)
    })
  )

  return results
}

export async function getPaymentsBySchool(schoolId: string) {
  const paymentsSnap = await adminDb()
    .collection('payments')
    .where('school_id', '==', schoolId)
    .orderBy('created_at', 'desc')
    .get()

  const payments = await Promise.all(
    paymentsSnap.docs.map(async (doc) => {
      const data = doc.data()
      const [studentDoc, feeDoc] = await Promise.all([
        adminDb().collection('students').doc(data.student_id).get(),
        adminDb().collection('fees').doc(data.fee_id).get(),
      ])

      return serializeTimestamps({
        id: doc.id,
        ...data,
        student: studentDoc.exists ? { id: studentDoc.id, ...studentDoc.data() } : null,
        fee: feeDoc.exists ? { id: feeDoc.id, ...feeDoc.data() } : null,
      } as any)
    })
  )

  return payments
}

// ── Overdue Payments ───────────────────────────────────────────────────────

export async function getOverduePayments(schoolId: string) {
  // Get all unpaid/partially paid fees
  const feesSnap = await adminDb()
    .collection('fees')
    .where('school_id', '==', schoolId)
    .get()

  const overdue: any[] = []

  for (const feeDoc of feesSnap.docs) {
    const feeData = feeDoc.data()
    const balance = (feeData.total_amount as number) - (feeData.amount_paid as number)

    if (balance <= 0) continue

    // Get fee structure to check payment deadline
    const termId = feeData.term_id as string
    const studentId = feeData.student_id as string

    // Get student's class
    const studentDoc = await adminDb().collection('students').doc(studentId).get()
    if (!studentDoc.exists) continue

    const classId = (studentDoc.data()!).class_id as string

    // Get fee structure for this class + term
    const feeStructureSnap = await adminDb()
      .collection('fee_structures')
      .where('school_id', '==', schoolId)
      .where('class_id', '==', classId)
      .where('term_id', '==', termId)
      .limit(1)
      .get()

    if (feeStructureSnap.empty) continue

    const feeStructure = feeStructureSnap.docs[0].data()
    const deadline = feeStructure.payment_deadline as string | null

    if (!deadline) continue

    const today = new Date().toISOString().split('T')[0]
    if (deadline >= today) continue  // Not overdue yet

    // Get linked class and term
    const [classDoc, termDoc] = await Promise.all([
      adminDb().collection('classes').doc(classId).get(),
      adminDb().collection('terms').doc(termId).get(),
    ])

    // Get parent phone for notifications
    const parentSnap = await adminDb()
      .collection('parent_student')
      .where('student_id', '==', studentId)
      .where('is_primary', '==', true)
      .limit(1)
      .get()

    let parentPhone: string | null = null
    if (!parentSnap.empty) {
      const parentId = parentSnap.docs[0].data().parent_id as string
      const parentDoc = await adminDb().collection('users').doc(parentId).get()
      if (parentDoc.exists) {
        parentPhone = ((parentDoc.data() as any).phone as string) || null
      }
    }

    overdue.push({
      feeId: feeDoc.id,
      studentId,
      studentName: (studentDoc.data()!).full_name,
      className: classDoc.exists ? ((classDoc.data() as any).name as string) : 'Unknown',
      classId,
      teacherId: classDoc.exists ? ((classDoc.data() as any).teacher_id as string | null) : null,
      termName: termDoc.exists ? ((termDoc.data() as any).name as string) : 'Unknown',
      termYear: termDoc.exists ? ((termDoc.data() as any).year as number) : null,
      totalAmount: feeData.total_amount as number,
      amountPaid: feeData.amount_paid as number,
      balance,
      deadline,
      parentPhone,
    })
  }

  return overdue
}
