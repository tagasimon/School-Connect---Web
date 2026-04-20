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

export async function addTeacher(
  schoolId: string,
  data: { fullName: string; email: string; phone?: string }
) {
  await verifySession()

  // Create Firebase Auth user
  let uid: string
  try {
    const userRecord = await adminAuth().createUser({
      email: data.email,
      displayName: data.fullName,
      password: Math.random().toString(36).slice(-12) + 'A1!',
    })
    uid = userRecord.uid
  } catch (err: any) {
    if (err.code === 'auth/email-already-exists') {
      return { error: 'A user with this email already exists' }
    }
    return { error: 'Failed to create user account' }
  }

  // Write to users collection
  await adminDb().collection('users').doc(uid).set({
    uid,
    school_id: schoolId,
    role: 'teacher',
    full_name: data.fullName,
    email: data.email,
    phone: data.phone || null,
    created_at: Timestamp.now(),
    updated_at: Timestamp.now(),
  })

  return { success: true, uid }
}

export async function updateTeacher(
  teacherId: string,
  data: { fullName?: string; phone?: string; subjects?: string[] }
) {
  await verifySession()

  const updateData: Record<string, unknown> = {
    updated_at: Timestamp.now(),
  }
  if (data.fullName !== undefined) updateData.full_name = data.fullName
  if (data.phone !== undefined) updateData.phone = data.phone
  if (data.subjects !== undefined) updateData.subjects = data.subjects

  await adminDb().collection('users').doc(teacherId).update(updateData)
  return { success: true }
}

export async function assignTeacherToClasses(teacherId: string, classIds: string[]) {
  await verifySession()

  const batch = adminDb().batch()
  for (const classId of classIds) {
    batch.update(adminDb().collection('classes').doc(classId), {
      teacher_id: teacherId,
      updated_at: Timestamp.now(),
    })
  }
  await batch.commit()
  return { success: true }
}

export async function getTeacherWithClasses(schoolId: string, teacherId: string) {
  const [userDoc, classesSnap, subjectsSnap] = await Promise.all([
    adminDb().collection('users').doc(teacherId).get(),
    adminDb().collection('classes').where('school_id', '==', schoolId).get(),
    adminDb().collection('subjects').where('school_id', '==', schoolId).get(),
  ])

  if (!userDoc.exists) return null

  const teacher = { id: userDoc.id, ...userDoc.data() } as Record<string, any>
  const allClasses = classesSnap.docs.map(d => ({
    id: d.id,
    name: d.data().name as string,
    teacher_id: d.data().teacher_id as string | undefined,
  }))
  const assignedClassIds = allClasses
    .filter(c => c.teacher_id === teacherId)
    .map(c => c.id as string)
  const subjects = subjectsSnap.docs.map(d => ({ id: d.id, ...d.data() }) as Record<string, any>)

  return { teacher, allClasses, assignedClassIds, subjects }
}
