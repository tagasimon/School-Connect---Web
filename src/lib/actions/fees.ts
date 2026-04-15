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
      if (typeof v.toDate === 'function') {
        result[key] = (v.toDate() as Date).toISOString()
      } else if ('_seconds' in v && typeof v._seconds === 'number') {
        result[key] = new Date(v._seconds * 1000).toISOString()
      } else if ('seconds' in v && typeof v.seconds === 'number') {
        result[key] = new Date(v.seconds * 1000).toISOString()
      } else {
        result[key] = serializeTimestamps(value as Record<string, unknown>)
      }
    } else {
      result[key] = value
    }
  }
  return result as T
}

// Chunk an array into slices of at most `size` (Firestore `in` limit is 30)
function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size))
  return chunks
}

// Fetch docs by IDs in batches using `in`, returns a Map of id → data
async function batchGetByIds(
  collection: string,
  ids: string[]
): Promise<Map<string, Record<string, unknown>>> {
  const map = new Map<string, Record<string, unknown>>()
  if (ids.length === 0) return map

  const snaps = await Promise.all(
    chunk([...new Set(ids)], 30).map(c =>
      adminDb().collection(collection).where('__name__', 'in', c).get()
    )
  )
  for (const snap of snaps) {
    for (const doc of snap.docs) map.set(doc.id, doc.data())
  }
  return map
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

  const studentIds = studentsSnap.docs.map(d => d.id)
  let created = 0
  let skipped = 0

  if (studentIds.length > 0) {
    // Fetch all existing fee records for this term in one batch (no per-student queries)
    const existingFeeSnaps = await Promise.all(
      chunk(studentIds, 30).map(c =>
        adminDb()
          .collection('fees')
          .where('school_id', '==', schoolId)
          .where('term_id', '==', data.termId)
          .where('student_id', 'in', c)
          .get()
      )
    )
    const alreadyHasFee = new Set(existingFeeSnaps.flatMap(s => s.docs.map(d => d.data().student_id as string)))

    const batch = adminDb().batch()
    for (const studentId of studentIds) {
      if (alreadyHasFee.has(studentId)) { skipped++; continue }
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
  }

  return { success: true, id: docRef.id, created, skipped }
}

export async function getFeeStructuresBySchool(schoolId: string) {
  const snap = await adminDb()
    .collection('fee_structures')
    .where('school_id', '==', schoolId)
    .orderBy('created_at', 'desc')
    .get()

  if (snap.empty) return []

  // Batch fetch all related classes and terms in 2 queries instead of 2N
  const classIds = [...new Set(snap.docs.map(d => d.data().class_id as string))]
  const termIds  = [...new Set(snap.docs.map(d => d.data().term_id  as string))]

  const [classMap, termMap] = await Promise.all([
    batchGetByIds('classes', classIds),
    batchGetByIds('terms',   termIds),
  ])

  return snap.docs.map(doc => {
    const data = doc.data()
    const classData = classMap.get(data.class_id as string)
    const termData  = termMap.get(data.term_id   as string)
    return serializeTimestamps({
      id: doc.id,
      ...data,
      class: classData ? { id: data.class_id, ...classData } : null,
      term:  termData  ? { id: data.term_id,  ...termData  } : null,
    } as any)
  })
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

  const studentIds = studentsSnap.docs.map(d => d.id)
  let created = 0
  let skipped = 0

  if (studentIds.length > 0) {
    // Batch check existing fees — no per-student queries
    const existingFeeSnaps = await Promise.all(
      chunk(studentIds, 30).map(c =>
        adminDb()
          .collection('fees')
          .where('school_id', '==', schoolId)
          .where('term_id', '==', termId)
          .where('student_id', 'in', c)
          .get()
      )
    )
    const alreadyHasFee = new Set(existingFeeSnaps.flatMap(s => s.docs.map(d => d.data().student_id as string)))

    const batch = adminDb().batch()
    for (const studentId of studentIds) {
      if (alreadyHasFee.has(studentId)) { skipped++; continue }
      const feeRef = adminDb().collection('fees').doc()
      batch.set(feeRef, {
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
    await batch.commit()
  }

  return { success: true, created, skipped }
}

// ── Fee Records ────────────────────────────────────────────────────────────

export async function getFeesWithStudents(schoolId: string) {
  const feesSnap = await adminDb()
    .collection('fees')
    .where('school_id', '==', schoolId)
    .get()

  if (feesSnap.empty) return []

  const studentIds = [...new Set(feesSnap.docs.map(d => d.data().student_id as string))]
  const termIds    = [...new Set(feesSnap.docs.map(d => d.data().term_id    as string))]

  const [studentMap, termMap] = await Promise.all([
    batchGetByIds('students', studentIds),
    batchGetByIds('terms',    termIds),
  ])

  return feesSnap.docs.map(doc => {
    const data = doc.data()
    const studentData = studentMap.get(data.student_id as string)
    const termData    = termMap.get(data.term_id       as string)
    return serializeTimestamps({
      id: doc.id,
      ...data,
      student: studentData ? { id: data.student_id, ...studentData } : null,
      term:    termData    ? { id: data.term_id,    ...termData    } : null,
    } as any)
  })
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
  const studentsSnap = await adminDb()
    .collection('students')
    .where('school_id', '==', schoolId)
    .where('class_id', '==', classId)
    .where('status', '==', 'active')
    .orderBy('full_name')
    .get()

  if (studentsSnap.empty) return []

  const studentIds = studentsSnap.docs.map(d => d.id)

  // Batch fetch all fees for these students in one round trip
  const feeSnaps = await Promise.all(
    chunk(studentIds, 30).map(c =>
      adminDb()
        .collection('fees')
        .where('school_id', '==', schoolId)
        .where('student_id', 'in', c)
        .get()
    )
  )
  const feesByStudentId = new Map<string, { id: string; data: FirebaseFirestore.DocumentData }>()
  const feeIds: string[] = []
  for (const snap of feeSnaps) {
    for (const doc of snap.docs) {
      feesByStudentId.set(doc.data().student_id as string, { id: doc.id, data: doc.data() })
      feeIds.push(doc.id)
    }
  }

  // Batch fetch all payments for these fees in one round trip
  const paymentSnaps = feeIds.length > 0
    ? await Promise.all(
        chunk(feeIds, 30).map(c =>
          adminDb()
            .collection('payments')
            .where('fee_id', 'in', c)
            .orderBy('created_at', 'desc')
            .get()
        )
      )
    : []
  const paymentsByFeeId = new Map<string, ReturnType<typeof serializeTimestamps>[]>()
  for (const snap of paymentSnaps) {
    for (const doc of snap.docs) {
      const feeId = doc.data().fee_id as string
      if (!paymentsByFeeId.has(feeId)) paymentsByFeeId.set(feeId, [])
      paymentsByFeeId.get(feeId)!.push(serializeTimestamps({ id: doc.id, ...doc.data() } as any))
    }
  }

  return studentsSnap.docs.map(studentDoc => {
    const studentId = studentDoc.id
    const fee = feesByStudentId.get(studentId)
    if (!fee) {
      return { student: serializeTimestamps({ id: studentId, ...studentDoc.data() } as any), fee: null, payments: [] }
    }
    return serializeTimestamps({
      student: { id: studentId, ...studentDoc.data() },
      fee: { id: fee.id, ...fee.data },
      payments: paymentsByFeeId.get(fee.id) ?? [],
    } as any)
  })
}

export async function getPaymentsBySchool(schoolId: string) {
  const paymentsSnap = await adminDb()
    .collection('payments')
    .where('school_id', '==', schoolId)
    .orderBy('created_at', 'desc')
    .get()

  if (paymentsSnap.empty) return []

  const studentIds = [...new Set(paymentsSnap.docs.map(d => d.data().student_id as string))]
  const feeIds     = [...new Set(paymentsSnap.docs.map(d => d.data().fee_id     as string))]

  const [studentMap, feeMap] = await Promise.all([
    batchGetByIds('students', studentIds),
    batchGetByIds('fees',     feeIds),
  ])

  return paymentsSnap.docs.map(doc => {
    const data = doc.data()
    const studentData = studentMap.get(data.student_id as string)
    const feeData     = feeMap.get(data.fee_id         as string)
    return serializeTimestamps({
      id: doc.id,
      ...data,
      student: studentData ? { id: data.student_id, ...studentData } : null,
      fee:     feeData     ? { id: data.fee_id,     ...feeData     } : null,
    } as any)
  })
}

// ── Overdue Payments ───────────────────────────────────────────────────────

export async function getOverduePayments(schoolId: string) {
  const today = new Date().toISOString().split('T')[0]

  // 1. Fetch all fees with an outstanding balance
  const feesSnap = await adminDb()
    .collection('fees')
    .where('school_id', '==', schoolId)
    .get()

  const unpaidFees = feesSnap.docs.filter(d => {
    const data = d.data()
    return ((data.total_amount as number) - (data.amount_paid as number)) > 0
  })

  if (unpaidFees.length === 0) return []

  // 2. Batch-fetch all related students, terms, fee_structures in parallel
  const studentIds    = [...new Set(unpaidFees.map(d => d.data().student_id as string))]
  const termIds       = [...new Set(unpaidFees.map(d => d.data().term_id    as string))]

  const [studentMap, termMap, feeStructuresSnap] = await Promise.all([
    batchGetByIds('students', studentIds),
    batchGetByIds('terms',    termIds),
    adminDb().collection('fee_structures').where('school_id', '==', schoolId).get(),
  ])

  // Build a lookup: "classId|termId" → payment_deadline
  const deadlineMap = new Map<string, string | null>()
  for (const doc of feeStructuresSnap.docs) {
    const d = doc.data()
    deadlineMap.set(`${d.class_id}|${d.term_id}`, (d.payment_deadline as string) || null)
  }

  // 3. Filter to actually overdue entries and collect classIds for batch fetch
  type OverdueEntry = {
    feeId: string; studentId: string; studentName: string
    classId: string; termId: string
    totalAmount: number; amountPaid: number; balance: number; deadline: string
  }
  const candidates: OverdueEntry[] = []
  for (const feeDoc of unpaidFees) {
    const data       = feeDoc.data()
    const studentId  = data.student_id as string
    const termId     = data.term_id    as string
    const studentData = studentMap.get(studentId)
    if (!studentData) continue

    const classId  = studentData.class_id as string
    const deadline = deadlineMap.get(`${classId}|${termId}`)
    if (!deadline || deadline >= today) continue

    candidates.push({
      feeId:       feeDoc.id,
      studentId,
      studentName: studentData.full_name as string,
      classId,
      termId,
      totalAmount: data.total_amount as number,
      amountPaid:  data.amount_paid  as number,
      balance:     (data.total_amount as number) - (data.amount_paid as number),
      deadline,
    })
  }

  if (candidates.length === 0) return []

  // 4. Batch-fetch classes and primary parent links
  const classIds = [...new Set(candidates.map(c => c.classId))]
  const [classMap, parentStudentSnap] = await Promise.all([
    batchGetByIds('classes', classIds),
    adminDb()
      .collection('parent_student')
      .where('school_id', '==', schoolId)
      .where('is_primary', '==', true)
      .get(),
  ])

  // Build student → parent_id map
  const primaryParentByStudent = new Map<string, string>()
  for (const doc of parentStudentSnap.docs) {
    const d = doc.data()
    primaryParentByStudent.set(d.student_id as string, d.parent_id as string)
  }

  // 5. Batch-fetch parent users for phone numbers
  const parentIds = [...new Set([...primaryParentByStudent.values()])]
  const parentMap = await batchGetByIds('users', parentIds)

  // 6. Assemble final result
  return candidates.map(c => {
    const classData  = classMap.get(c.classId)
    const termData   = termMap.get(c.termId)
    const parentId   = primaryParentByStudent.get(c.studentId)
    const parentData = parentId ? parentMap.get(parentId) : undefined

    return {
      feeId:       c.feeId,
      studentId:   c.studentId,
      studentName: c.studentName,
      className:   classData ? (classData.name as string)     : 'Unknown',
      classId:     c.classId,
      teacherId:   classData ? (classData.teacher_id as string | null) : null,
      termName:    termData  ? (termData.name        as string)     : 'Unknown',
      termYear:    termData  ? (termData.year        as number)     : null,
      totalAmount: c.totalAmount,
      amountPaid:  c.amountPaid,
      balance:     c.balance,
      deadline:    c.deadline,
      parentPhone: parentData ? ((parentData.phone as string) || null) : null,
    }
  })
}
