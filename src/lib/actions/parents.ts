'use server'

import { adminDb, adminAuth } from '@/lib/firebase/admin'
import { Timestamp } from 'firebase-admin/firestore'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { phoneToAuthEmail } from '@/lib/utils/phone'

async function verifySession() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')?.value
  if (!sessionCookie) redirect('/login')
  return adminAuth().verifySessionCookie(sessionCookie, true)
}

export async function createParentAccount(
  schoolId: string,
  data: { name: string; phone: string; email: string; password: string }
) {
  await verifySession()

  const email = data.email.trim().toLowerCase()

  const existingSnap = await adminDb()
    .collection('users')
    .where('email', '==', email)
    .where('role', '==', 'parent')
    .limit(1)
    .get()

  if (!existingSnap.empty) {
    return { success: false as const, error: 'A parent account with this email already exists' }
  }

  try {
    const userRecord = await adminAuth().createUser({
      email,
      password: data.password,
      displayName: data.name,
    })

    await adminDb().collection('users').doc(userRecord.uid).set({
      email,
      full_name: data.name,
      phone: data.phone,
      role: 'parent',
      school_id: null,
      has_auth_account: true,
      created_at: Timestamp.now(),
      updated_at: Timestamp.now(),
    })

    return { success: true as const, parentId: userRecord.uid }
  } catch (err: any) {
    if (err?.code === 'auth/email-already-exists') {
      return { success: false as const, error: 'A parent account with this email already exists' }
    }
    return { success: false as const, error: 'Failed to create parent account' }
  }
}

export async function getParentsForSchool(schoolId: string) {
  const studentsSnap = await adminDb()
    .collection('students')
    .where('school_id', '==', schoolId)
    .get()

  if (studentsSnap.empty) return []

  const studentIds = studentsSnap.docs.map(d => d.id)
  const studentNameById = new Map(
    studentsSnap.docs.map(d => [d.id, d.data().full_name as string])
  )

  const chunks: string[][] = []
  for (let i = 0; i < studentIds.length; i += 30) chunks.push(studentIds.slice(i, i + 30))

  const linkSnaps = await Promise.all(
    chunks.map(chunk =>
      adminDb().collection('parent_student').where('student_id', 'in', chunk).get()
    )
  )
  const links = linkSnaps.flatMap(s => s.docs)

  if (links.length === 0) return []

  const studentsByParent = new Map<string, { studentId: string; studentName: string; relationship: string }[]>()
  for (const link of links) {
    const parentId = link.data().parent_id as string
    const studentId = link.data().student_id as string
    if (!studentsByParent.has(parentId)) studentsByParent.set(parentId, [])
    studentsByParent.get(parentId)!.push({
      studentId,
      studentName: studentNameById.get(studentId) ?? 'Unknown',
      relationship: (link.data().relationship as string) ?? '',
    })
  }

  const parentIds = [...studentsByParent.keys()]
  const parentDocs = await Promise.all(
    parentIds.map(id => adminDb().collection('users').doc(id).get())
  )

  return parentDocs
    .filter(d => d.exists)
    .map(d => ({
      id: d.id,
      name: (d.data()!.full_name as string) ?? '',
      phone: (d.data()!.phone as string) ?? '',
      hasAuthAccount: (d.data()!.has_auth_account as boolean) === true,
      students: studentsByParent.get(d.id) ?? [],
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export async function getParentWithStudents(parentId: string) {
  const parentDoc = await adminDb().collection('users').doc(parentId).get()
  if (!parentDoc.exists) return null

  const linksSnap = await adminDb()
    .collection('parent_student')
    .where('parent_id', '==', parentId)
    .get()

  const studentIds = linksSnap.docs.map(d => d.data().student_id as string)

  const studentDocs =
    studentIds.length > 0
      ? await Promise.all(studentIds.map(id => adminDb().collection('students').doc(id).get()))
      : []

  const students = linksSnap.docs.map(link => {
    const studentId = link.data().student_id as string
    const studentDoc = studentDocs.find(d => d.id === studentId)
    return {
      linkId: link.id,
      studentId,
      studentName: (studentDoc?.data()?.full_name as string) ?? 'Unknown',
      classId: (studentDoc?.data()?.class_id as string) ?? '',
      relationship: (link.data().relationship as string) ?? '',
      is_primary: link.data().is_primary as boolean,
    }
  })

  return {
    id: parentDoc.id,
    name: (parentDoc.data()!.full_name as string) ?? '',
    phone: (parentDoc.data()!.phone as string) ?? '',
    email: (parentDoc.data()!.email as string) ?? '',
    students,
  }
}

export async function getStudentsForSchool(schoolId: string) {
  const [studentsSnap, classesSnap] = await Promise.all([
    adminDb()
      .collection('students')
      .where('school_id', '==', schoolId)
      .where('status', '==', 'active')
      .orderBy('full_name')
      .get(),
    adminDb()
      .collection('classes')
      .where('school_id', '==', schoolId)
      .get(),
  ])

  const classNameById = new Map(
    classesSnap.docs.map(d => [d.id, d.data().name as string])
  )

  return studentsSnap.docs.map(d => ({
    id: d.id,
    name: d.data().full_name as string,
    classId: d.data().class_id as string,
    className: classNameById.get(d.data().class_id as string) ?? '',
  }))
}

export async function updateParentInfo(
  parentId: string,
  data: { name?: string; phone?: string; password?: string }
) {
  await verifySession()

  const update: Record<string, unknown> = { updated_at: Timestamp.now() }
  if (data.name) update.full_name = data.name
  if (data.phone) {
    update.phone = data.phone
    update.email = phoneToAuthEmail(data.phone)
  }

  await adminDb().collection('users').doc(parentId).update(update)

  const authUpdate: { displayName?: string; email?: string; password?: string } = {}
  if (data.name) authUpdate.displayName = data.name
  if (data.phone) authUpdate.email = phoneToAuthEmail(data.phone)
  if (data.password) authUpdate.password = data.password

  if (Object.keys(authUpdate).length > 0) {
    try {
      await adminAuth().updateUser(parentId, authUpdate)
      if (data.password) {
        await adminDb().collection('users').doc(parentId).update({ has_auth_account: true })
      }
    } catch {
      if (data.password) {
        // Placeholder: no Auth account yet — create one now using the same doc ID as UID
        try {
          const parentDoc = await adminDb().collection('users').doc(parentId).get()
          const phone = parentDoc.data()?.phone as string | undefined
          const name = parentDoc.data()?.full_name as string | undefined
          if (phone) {
            await adminAuth().createUser({
              uid: parentId,
              email: phoneToAuthEmail(phone),
              password: data.password,
              displayName: name,
            })
            await adminDb().collection('users').doc(parentId).update({ has_auth_account: true })
          }
        } catch {
          // Auth creation failed — leave placeholder as-is
        }
      }
    }
  }

  return { success: true as const }
}

export async function linkParentToStudent(
  parentId: string,
  studentId: string,
  relationship: string
) {
  await verifySession()

  const existingSnap = await adminDb()
    .collection('parent_student')
    .where('parent_id', '==', parentId)
    .where('student_id', '==', studentId)
    .limit(1)
    .get()

  if (!existingSnap.empty) {
    return { success: false as const, error: 'Parent is already linked to this student' }
  }

  await adminDb().collection('parent_student').add({
    parent_id: parentId,
    student_id: studentId,
    relationship,
    is_primary: false,
    created_at: Timestamp.now(),
  })

  return { success: true as const }
}

export async function unlinkParentFromStudent(linkId: string) {
  await verifySession()
  await adminDb().collection('parent_student').doc(linkId).delete()
  return { success: true as const }
}

export async function searchParentByPhone(phone: string) {
  const snap = await adminDb()
    .collection('users')
    .where('phone', '==', phone)
    .where('role', '==', 'parent')
    .limit(1)
    .get()

  if (snap.empty) return null

  const doc = snap.docs[0]
  return {
    id: doc.id,
    name: (doc.data().full_name as string) ?? '',
    phone: (doc.data().phone as string) ?? '',
  }
}

export async function searchParents(email: string) {
  if (!email.trim()) return []

  const snap = await adminDb()
    .collection('users')
    .where('role', '==', 'parent')
    .where('email', '==', email.trim().toLowerCase())
    .limit(5)
    .get()

  return snap.docs.map(d => ({
    id: d.id,
    name: (d.data().full_name as string) ?? '',
    phone: (d.data().phone as string) ?? '',
    email: (d.data().email as string) ?? '',
    hasAuthAccount: d.data().has_auth_account === true,
  }))
}
