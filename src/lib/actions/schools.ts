'use server'

import { adminDb, adminAuth } from '@/lib/firebase/admin'
import { Timestamp } from 'firebase-admin/firestore'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function createSchool(data: {
  name: string
  email: string
  phone: string
  address: string
  subscriptionPlan?: string
}) {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')?.value
  if (!sessionCookie) redirect('/login')

  const decoded = await adminAuth().verifySessionCookie(sessionCookie, true)

  // Verify user is super_admin
  const userDoc = await adminDb().collection('users').doc(decoded.uid).get()
  if (userDoc.data()?.role !== 'super_admin') {
    throw new Error('Unauthorized: Super admin access required')
  }

  const docRef = adminDb().collection('schools').doc()
  await docRef.set({
    name: data.name,
    address: data.address,
    phone: data.phone,
    email: data.email,
    subscription_status: 'trial',
    subscription_plan: data.subscriptionPlan || 'standard',
    created_at: Timestamp.now(),
    updated_at: Timestamp.now(),
  })

  return { success: true, id: docRef.id }
}

export async function updateSchool(schoolId: string, data: {
  name?: string
  email?: string
  phone?: string
  address?: string
  subscription_status?: string
  subscription_plan?: string
}) {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')?.value
  if (!sessionCookie) redirect('/login')

  const decoded = await adminAuth().verifySessionCookie(sessionCookie, true)

  // Verify user is super_admin
  const userDoc = await adminDb().collection('users').doc(decoded.uid).get()
  if (userDoc.data()?.role !== 'super_admin') {
    throw new Error('Unauthorized: Super admin access required')
  }

  const updateData: Record<string, unknown> = {
    updated_at: Timestamp.now(),
  }

  if (data.name !== undefined) updateData.name = data.name
  if (data.email !== undefined) updateData.email = data.email
  if (data.phone !== undefined) updateData.phone = data.phone
  if (data.address !== undefined) updateData.address = data.address
  if (data.subscription_status !== undefined) updateData.subscription_status = data.subscription_status
  if (data.subscription_plan !== undefined) updateData.subscription_plan = data.subscription_plan

  await adminDb().collection('schools').doc(schoolId).update(updateData)

  return { success: true }
}

export async function deleteSchool(schoolId: string) {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')?.value
  if (!sessionCookie) redirect('/login')

  const decoded = await adminAuth().verifySessionCookie(sessionCookie, true)

  // Verify user is super_admin
  const userDoc = await adminDb().collection('users').doc(decoded.uid).get()
  if (userDoc.data()?.role !== 'super_admin') {
    throw new Error('Unauthorized: Super admin access required')
  }

  // Delete all related data
  const batch = adminDb().batch()

  // Delete students
  const studentsSnap = await adminDb()
    .collection('students')
    .where('school_id', '==', schoolId)
    .get()
  studentsSnap.docs.forEach(doc => batch.delete(doc.ref))

  // Delete classes
  const classesSnap = await adminDb()
    .collection('classes')
    .where('school_id', '==', schoolId)
    .get()
  classesSnap.docs.forEach(doc => batch.delete(doc.ref))

  // Delete subjects
  const subjectsSnap = await adminDb()
    .collection('subjects')
    .where('school_id', '==', schoolId)
    .get()
  subjectsSnap.docs.forEach(doc => batch.delete(doc.ref))

  // Delete terms
  const termsSnap = await adminDb()
    .collection('terms')
    .where('school_id', '==', schoolId)
    .get()
  termsSnap.docs.forEach(doc => batch.delete(doc.ref))

  // Delete fees
  const feesSnap = await adminDb()
    .collection('fees')
    .where('school_id', '==', schoolId)
    .get()
  feesSnap.docs.forEach(doc => batch.delete(doc.ref))

  // Delete results
  const resultsSnap = await adminDb()
    .collection('results')
    .where('school_id', '==', schoolId)
    .get()
  resultsSnap.docs.forEach(doc => batch.delete(doc.ref))

  // Delete attendance
  const attendanceSnap = await adminDb()
    .collection('attendance')
    .where('school_id', '==', schoolId)
    .get()
  attendanceSnap.docs.forEach(doc => batch.delete(doc.ref))

  // Delete announcements
  const announcementsSnap = await adminDb()
    .collection('announcements')
    .where('school_id', '==', schoolId)
    .get()
  announcementsSnap.docs.forEach(doc => batch.delete(doc.ref))

  // Delete school users (teachers, accountants, etc.)
  const usersSnap = await adminDb()
    .collection('users')
    .where('school_id', '==', schoolId)
    .get()
  usersSnap.docs.forEach(doc => batch.delete(doc.ref))

  // Finally delete the school
  batch.delete(adminDb().collection('schools').doc(schoolId))

  await batch.commit()

  return { success: true }
}

export async function createSchoolAdmin(
  schoolId: string,
  data: {
    email: string
    password: string
    full_name: string
    phone?: string
  }
) {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')?.value
  if (!sessionCookie) redirect('/login')

  const decoded = await adminAuth().verifySessionCookie(sessionCookie, true)

  // Verify user is super_admin
  const userDoc = await adminDb().collection('users').doc(decoded.uid).get()
  if (userDoc.data()?.role !== 'super_admin') {
    throw new Error('Unauthorized: Super admin access required')
  }

  // Create Firebase Auth user
  const userRecord = await adminAuth().createUser({
    email: data.email,
    password: data.password,
    displayName: data.full_name,
  })

  // Create profile in Firestore
  await adminDb().collection('users').doc(userRecord.uid).set({
    email: data.email,
    full_name: data.full_name,
    phone: data.phone || null,
    role: 'school_admin',
    school_id: schoolId,
    created_at: Timestamp.now(),
    updated_at: Timestamp.now(),
  })

  return { success: true, uid: userRecord.uid }
}

export async function getSchoolById(schoolId: string) {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')?.value
  if (!sessionCookie) return null

  const decoded = await adminAuth().verifySessionCookie(sessionCookie, true)

  // Verify user is super_admin
  const userDoc = await adminDb().collection('users').doc(decoded.uid).get()
  if (userDoc.data()?.role !== 'super_admin') {
    return null
  }

  const schoolDoc = await adminDb().collection('schools').doc(schoolId).get()
  if (!schoolDoc.exists) return null

  return { id: schoolDoc.id, ...schoolDoc.data() }
}

export async function getSchoolAdmins(schoolId: string) {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')?.value
  if (!sessionCookie) return []

  const decoded = await adminAuth().verifySessionCookie(sessionCookie, true)

  // Verify user is super_admin
  const userDoc = await adminDb().collection('users').doc(decoded.uid).get()
  if (userDoc.data()?.role !== 'super_admin') {
    return []
  }

  const snap = await adminDb()
    .collection('users')
    .where('school_id', '==', schoolId)
    .where('role', '==', 'school_admin')
    .get()

  // Helper to serialize Timestamps
  function serializeTimestamps<T extends Record<string, unknown>>(data: T): T {
    if (!data) return data
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(data)) {
      if (value && typeof value === 'object') {
        if ('_seconds' in value && typeof (value as any).seconds === 'number') {
          result[key] = { _seconds: (value as any).seconds, _nanoseconds: (value as any).nanoseconds }
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

  return snap.docs.map(doc => serializeTimestamps({ id: doc.id, ...doc.data() }) as any)
}
