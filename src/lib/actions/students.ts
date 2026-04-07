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

// ── Student Management ─────────────────────────────────────────────────────

export async function addStudentWithParent(
  schoolId: string,
  data: {
    fullName: string
    studentNumber?: string
    dateOfBirth: string  // YYYY-MM-DD
    gender: 'male' | 'female' | 'other'
    classId: string
    // Parent info (inline)
    parentName: string
    parentPhone: string
    parentRelationship: string
    // Commitments
    commitmentIds: string[]  // selected commitment type IDs
  }
) {
  const decoded = await verifySession()

  // Create student
  const studentRef = adminDb().collection('students').doc()
  await studentRef.set({
    school_id: schoolId,
    class_id: data.classId,
    full_name: data.fullName,
    student_number: data.studentNumber || null,
    date_of_birth: Timestamp.fromDate(new Date(data.dateOfBirth)),
    gender: data.gender,
    status: 'active',
    created_at: Timestamp.now(),
    updated_at: Timestamp.now(),
  })

  // Link parent (create user if needed, or link existing)
  const parentProfile = await findOrCreateParent(schoolId, data.parentName, data.parentPhone)

  if (parentProfile) {
    await adminDb().collection('parent_student').add({
      parent_id: parentProfile.id,
      student_id: studentRef.id,
      relationship: data.parentRelationship,
      is_primary: true,
      created_at: Timestamp.now(),
    })
  }

  // Add commitments
  if (data.commitmentIds.length > 0) {
    const commitmentTypesSnap = await adminDb()
      .collection('commitment_types')
      .where('school_id', '==', schoolId)
      .get()

    const commitmentTypesMap = new Map(
      commitmentTypesSnap.docs.map(d => [d.id, d.data()])
    )

    for (const ctId of data.commitmentIds) {
      const ct = commitmentTypesMap.get(ctId)
      if (!ct) continue

      await adminDb().collection('student_commitments').add({
        student_id: studentRef.id,
        school_id: schoolId,
        commitment_type_id: ctId,
        name: ct.name as string,
        amount: ct.default_amount as number,
        created_at: Timestamp.now(),
      })
    }
  }

  // Generate fee record if fee structure exists for this class + term
  await autoGenerateFeeForStudent(schoolId, studentRef.id, data.classId)

  return { success: true, studentId: studentRef.id }
}

// ── Bulk Import ────────────────────────────────────────────────────────────

export async function bulkImportStudents(
  schoolId: string,
  students: Array<{
    fullName: string
    studentNumber?: string
    dateOfBirth: string
    gender: 'male' | 'female' | 'other'
    classId: string
    parentName: string
    parentPhone: string
    parentRelationship: string
  }>
) {
  const decoded = await verifySession()
  let imported = 0
  let errors: string[] = []

  const batch = adminDb().batch()

  for (let i = 0; i < students.length; i++) {
    const s = students[i]

    try {
      const studentRef = adminDb().collection('students').doc()
      batch.set(studentRef, {
        school_id: schoolId,
        class_id: s.classId,
        full_name: s.fullName,
        student_number: s.studentNumber || null,
        date_of_birth: Timestamp.fromDate(new Date(s.dateOfBirth)),
        gender: s.gender,
        status: 'active',
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
      })

      // Link parent
      const parentProfile = await findOrCreateParent(schoolId, s.parentName, s.parentPhone)
      if (parentProfile) {
        const psRef = adminDb().collection('parent_student').doc()
        batch.set(psRef, {
          parent_id: parentProfile.id,
          student_id: studentRef.id,
          relationship: s.parentRelationship,
          is_primary: true,
          created_at: Timestamp.now(),
        })
      }

      imported++
    } catch (err) {
      errors.push(`Row ${i + 1} (${s.fullName}): ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  await batch.commit()

  // Generate fee records for imported students
  const studentsSnap = await adminDb()
    .collection('students')
    .where('school_id', '==', schoolId)
    .where('status', '==', 'active')
    .get()

  for (const studentDoc of studentsSnap.docs) {
    const classId = (studentDoc.data() as any).class_id as string
    await autoGenerateFeeForStudent(schoolId, studentDoc.id, classId)
  }

  return { success: true, imported, errors }
}

// ── Commitment Types ───────────────────────────────────────────────────────

export async function getCommitmentTypes(schoolId: string) {
  const snap = await adminDb()
    .collection('commitment_types')
    .where('school_id', '==', schoolId)
    .where('is_active', '==', true)
    .get()

  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
}

export async function createCommitmentType(
  schoolId: string,
  data: { name: string; defaultAmount: number }
) {
  const decoded = await verifySession()

  const ref = adminDb().collection('commitment_types').doc()
  await ref.set({
    school_id: schoolId,
    name: data.name,
    default_amount: data.defaultAmount,
    is_active: true,
    created_at: Timestamp.now(),
  })

  return { success: true, id: ref.id }
}

// ── Helpers ────────────────────────────────────────────────────────────────

async function findOrCreateParent(
  schoolId: string,
  name: string,
  phone: string
): Promise<{ id: string } | null> {
  // Try to find existing parent by phone
  const existingSnap = await adminDb()
    .collection('users')
    .where('phone', '==', phone)
    .where('role', '==', 'parent')
    .limit(1)
    .get()

  if (!existingSnap.empty) {
    return { id: existingSnap.docs[0].id }
  }

  // Create a parent user without auth (just a Firestore profile)
  // The parent will create a Firebase Auth account later via the mobile app
  const parentRef = adminDb().collection('users').doc()
  await parentRef.set({
    email: `${phone}@parent.local`,
    full_name: name,
    phone,
    role: 'parent',
    school_id: null,  // parents aren't tied to a specific school at the user level
    created_at: Timestamp.now(),
    updated_at: Timestamp.now(),
  })

  return { id: parentRef.id }
}

async function autoGenerateFeeForStudent(
  schoolId: string,
  studentId: string,
  classId: string
) {
  // Get current term
  const termSnap = await adminDb()
    .collection('terms')
    .where('school_id', '==', schoolId)
    .where('is_current', '==', true)
    .limit(1)
    .get()

  if (termSnap.empty) return

  const termId = termSnap.docs[0].id

  // Check if fee already exists
  const existingSnap = await adminDb()
    .collection('fees')
    .where('school_id', '==', schoolId)
    .where('student_id', '==', studentId)
    .where('term_id', '==', termId)
    .limit(1)
    .get()

  if (!existingSnap.empty) return

  // Get fee structure for this class
  const feeStructureSnap = await adminDb()
    .collection('fee_structures')
    .where('school_id', '==', schoolId)
    .where('class_id', '==', classId)
    .where('term_id', '==', termId)
    .limit(1)
    .get()

  if (feeStructureSnap.empty) return

  const feeStructure = feeStructureSnap.docs[0].data()

  // Calculate total: base fee + commitments
  const commitmentsSnap = await adminDb()
    .collection('student_commitments')
    .where('student_id', '==', studentId)
    .get()

  const commitmentsTotal = commitmentsSnap.docs.reduce(
    (sum, d) => sum + (d.data().amount as number),
    0
  )

  const totalAmount = (feeStructure.amount as number) + commitmentsTotal

  const feeRef = adminDb().collection('fees').doc()
  await feeRef.set({
    student_id: studentId,
    school_id: schoolId,
    term_id: termId,
    total_amount: totalAmount,
    amount_paid: 0,
    notes: commitmentsTotal > 0 ? `Includes UGX ${commitmentsTotal.toLocaleString()} in additional services` : null,
    created_by: 'system',
    created_at: Timestamp.now(),
    updated_at: Timestamp.now(),
  })
}

// ── Class-based student queries ────────────────────────────────────────────

export async function getStudentsByClass(schoolId: string, classId: string) {
  const studentsSnap = await adminDb()
    .collection('students')
    .where('school_id', '==', schoolId)
    .where('class_id', '==', classId)
    .where('status', '==', 'active')
    .orderBy('full_name')
    .get()

  const students = await Promise.all(
    studentsSnap.docs.map(async (doc) => {
      const studentData = doc.data()

      // Get parent info
      const parentSnap = await adminDb()
        .collection('parent_student')
        .where('student_id', '==', doc.id)
        .where('is_primary', '==', true)
        .limit(1)
        .get()

      let parentInfo: { name: string; phone: string; relationship: string } | null = null
      if (!parentSnap.empty) {
        const parentData = parentSnap.docs[0].data()
        const parentId = parentData.parent_id as string
        const parentDoc = await adminDb().collection('users').doc(parentId).get()
        if (parentDoc.exists) {
          const pd = parentDoc.data()
          parentInfo = {
            name: (pd?.full_name as string) || 'Unknown',
            phone: (pd?.phone as string) || '',
            relationship: (parentData.relationship as string) || '',
          }
        }
      }

      // Get commitments
      const commitmentsSnap = await adminDb()
        .collection('student_commitments')
        .where('student_id', '==', doc.id)
        .get()

      const commitments = commitmentsSnap.docs.map(d => ({
        id: d.id,
        name: d.data().name as string,
        amount: d.data().amount as number,
      }))

      // Get fee info
      const feeSnap = await adminDb()
        .collection('fees')
        .where('student_id', '==', doc.id)
        .limit(1)
        .get()

      const fee = feeSnap.empty ? null : {
        id: feeSnap.docs[0].id,
        total_amount: feeSnap.docs[0].data().total_amount as number,
        amount_paid: feeSnap.docs[0].data().amount_paid as number,
      }

      return serializeTimestamps({
        id: doc.id,
        ...studentData,
        parent: parentInfo,
        commitments,
        fee,
      } as any)
    })
  )

  return students
}
