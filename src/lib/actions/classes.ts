'use server'

import { adminDb, adminAuth } from '@/lib/firebase/admin'
import { Timestamp } from 'firebase-admin/firestore'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

async function verifySession() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')?.value
  if (!sessionCookie) redirect('/login')
  return adminAuth().verifySessionCookie(sessionCookie, true)
}

export async function createClass(
  schoolId: string,
  data: { name: string; teacherId?: string; termId: string }
) {
  const decoded = await verifySession()

  // Check for duplicate name in same term
  const existing = await adminDb()
    .collection('classes')
    .where('school_id', '==', schoolId)
    .where('name', '==', data.name)
    .where('term_id', '==', data.termId)
    .limit(1)
    .get()

  if (!existing.empty) {
    return { error: 'A class with this name already exists for the selected term' }
  }

  const docRef = adminDb().collection('classes').doc()
  await docRef.set({
    school_id: schoolId,
    name: data.name,
    teacher_id: data.teacherId || null,
    term_id: data.termId,
    created_by: decoded.uid,
    created_at: Timestamp.now(),
    updated_at: Timestamp.now(),
  })

  return { success: true, id: docRef.id }
}

export async function updateClassTeacher(
  schoolId: string,
  classId: string,
  teacherId: string | null
) {
  await verifySession()

  await adminDb().collection('classes').doc(classId).update({
    teacher_id: teacherId,
    updated_at: Timestamp.now(),
  })

  return { success: true }
}
