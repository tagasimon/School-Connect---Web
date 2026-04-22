'use server'

import { adminDb, adminAuth } from '@/lib/firebase/admin'
import { Timestamp } from 'firebase-admin/firestore'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { phoneToAuthEmail } from '@/lib/utils/phone'

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
    // Parent: provide existing parentId OR new parent details
    parentId?: string
    parentName?: string
    parentPhone?: string
    parentPassword?: string
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

  // Link parent: use existing or create new
  let parentId = data.parentId
  if (!parentId && data.parentName && data.parentPhone) {
    const parentProfile = await findOrCreateParent(
      schoolId,
      data.parentName,
      data.parentPhone,
      data.parentPassword
    )
    parentId = parentProfile?.id
  }

  if (parentId) {
    await adminDb().collection('parent_student').add({
      parent_id: parentId,
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
  phone: string,
  password?: string
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

  const email = phoneToAuthEmail(phone)

  if (password) {
    // Create a real Firebase Auth account so the parent can log in immediately
    try {
      const userRecord = await adminAuth().createUser({
        email,
        password,
        displayName: name,
      })
      await adminDb().collection('users').doc(userRecord.uid).set({
        email,
        full_name: name,
        phone,
        role: 'parent',
        school_id: null,
        has_auth_account: true,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
      })
      return { id: userRecord.uid }
    } catch {
      // Fall through to create placeholder if Auth creation fails
    }
  }

  // Create a placeholder profile (no Auth account yet)
  const parentRef = adminDb().collection('users').doc()
  await parentRef.set({
    email,
    full_name: name,
    phone,
    role: 'parent',
    school_id: null,
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

// ── Student Update ─────────────────────────────────────────────────────────

export async function updateStudent(
  studentId: string,
  data: {
    fullName?: string
    gender?: string
    dateOfBirth?: string
    classId?: string
    // parentId = string → assign that parent; null → unlink; undefined → no change
    parentId?: string | null
    parentRelationship?: string
  }
) {
  await verifySession()

  const studentRef = adminDb().collection('students').doc(studentId)
  const studentDoc = await studentRef.get()
  if (!studentDoc.exists) throw new Error('Student not found')

  const studentUpdate: Record<string, unknown> = { updated_at: Timestamp.now() }
  if (data.fullName !== undefined) studentUpdate.full_name = data.fullName
  if (data.gender !== undefined) studentUpdate.gender = data.gender
  if (data.dateOfBirth !== undefined) studentUpdate.date_of_birth = Timestamp.fromDate(new Date(data.dateOfBirth))
  if (data.classId !== undefined) studentUpdate.class_id = data.classId

  await studentRef.update(studentUpdate)

  if (data.parentId !== undefined) {
    // Remove all existing parent links for this student
    const existingLinks = await adminDb()
      .collection('parent_student')
      .where('student_id', '==', studentId)
      .get()
    await Promise.all(existingLinks.docs.map(d => d.ref.delete()))

    // Assign new parent if provided
    if (data.parentId !== null) {
      await adminDb().collection('parent_student').add({
        parent_id: data.parentId,
        student_id: studentId,
        relationship: data.parentRelationship ?? 'parent',
        is_primary: true,
        created_at: Timestamp.now(),
      })
    }
  }

  return { success: true }
}

export async function getStudentForEdit(studentId: string) {
  const studentDoc = await adminDb().collection('students').doc(studentId).get()
  if (!studentDoc.exists) return null

  const student = { id: studentDoc.id, ...studentDoc.data() } as Record<string, unknown>

  // Serialize date_of_birth
  const dob = student.date_of_birth as { seconds?: number } | null
  if (dob?.seconds) {
    student.date_of_birth = new Date(dob.seconds * 1000).toISOString().split('T')[0]
  }

  const linkSnap = await adminDb()
    .collection('parent_student')
    .where('student_id', '==', studentId)
    .where('is_primary', '==', true)
    .limit(1)
    .get()

  let parent: { id: string; name: string; phone: string; relationship: string } | null = null
  if (!linkSnap.empty) {
    const link = linkSnap.docs[0]
    const parentDoc = await adminDb().collection('users').doc(link.data().parent_id as string).get()
    if (parentDoc.exists) {
      parent = {
        id: parentDoc.id,
        name: (parentDoc.data()?.full_name as string) || '',
        phone: (parentDoc.data()?.phone as string) || '',
        relationship: (link.data().relationship as string) || '',
      }
    }
  }

  return { student, parent }
}

// ── Class-based student queries ────────────────────────────────────────────

// Firestore `in` filter max is 30 items — chunk IDs and merge results
async function batchIn(
  collection: string,
  field: string,
  ids: string[],
) {
  if (ids.length === 0) return []
  const db = adminDb()
  const chunks: string[][] = []
  for (let i = 0; i < ids.length; i += 30) chunks.push(ids.slice(i, i + 30))
  const snaps = await Promise.all(
    chunks.map((chunk) => db.collection(collection).where(field, 'in', chunk).get()),
  )
  return snaps.flatMap((s) => s.docs)
}

export async function getStudentsByClass(schoolId: string, classId: string) {
  const studentsSnap = await adminDb()
    .collection('students')
    .where('school_id', '==', schoolId)
    .where('class_id', '==', classId)
    .where('status', '==', 'active')
    .orderBy('full_name')
    .get()

  if (studentsSnap.empty) return []

  const studentIds = studentsSnap.docs.map((d) => d.id)

  // Batch-fetch all related collections in parallel — one round-trip each
  const [parentStudentDocs, commitmentDocs, feeDocs] = await Promise.all([
    batchIn('parent_student', 'student_id', studentIds),
    batchIn('student_commitments', 'student_id', studentIds),
    batchIn('fees', 'student_id', studentIds),
  ])

  // Filter primary parent links and collect parent user IDs
  const primaryLinks = parentStudentDocs.filter((d) => d.data().is_primary === true)
  const parentUserIds = [...new Set(primaryLinks.map((d) => d.data().parent_id as string))]

  // Batch-fetch parent user docs
  const parentUserDocs =
    parentUserIds.length > 0
      ? await Promise.all(
          parentUserIds.map((id) => adminDb().collection('users').doc(id).get()),
        )
      : []

  // Build lookup maps
  const primaryLinkByStudent = new Map(primaryLinks.map((d) => [d.data().student_id as string, d]))
  const parentUserById = new Map(parentUserDocs.filter((d) => d.exists).map((d) => [d.id, d.data()]))

  const commitmentsByStudent = new Map<string, { id: string; name: string; amount: number }[]>()
  for (const d of commitmentDocs) {
    const sid = d.data().student_id as string
    if (!commitmentsByStudent.has(sid)) commitmentsByStudent.set(sid, [])
    commitmentsByStudent.get(sid)!.push({
      id: d.id,
      name: d.data().name as string,
      amount: d.data().amount as number,
    })
  }

  const feeByStudent = new Map<string, { id: string; total_amount: number; amount_paid: number }>()
  for (const d of feeDocs) {
    const sid = d.data().student_id as string
    if (!feeByStudent.has(sid)) {
      feeByStudent.set(sid, {
        id: d.id,
        total_amount: d.data().total_amount as number,
        amount_paid: d.data().amount_paid as number,
      })
    }
  }

  // Assemble results from in-memory maps — no more per-student network calls
  return studentsSnap.docs.map((doc) => {
    const link = primaryLinkByStudent.get(doc.id)
    let parentInfo: { name: string; phone: string; relationship: string } | null = null
    if (link) {
      const pd = parentUserById.get(link.data().parent_id as string)
      if (pd) {
        parentInfo = {
          name: (pd.full_name as string) || 'Unknown',
          phone: (pd.phone as string) || '',
          relationship: (link.data().relationship as string) || '',
        }
      }
    }

    return serializeTimestamps({
      id: doc.id,
      ...doc.data(),
      parent: parentInfo,
      commitments: commitmentsByStudent.get(doc.id) ?? [],
      fee: feeByStudent.get(doc.id) ?? null,
    } as any)
  })
}
