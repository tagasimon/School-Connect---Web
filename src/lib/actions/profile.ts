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

export async function updateMySchool(
  schoolId: string,
  data: { name?: string; email?: string; phone?: string; address?: string }
) {
  const decoded = await verifySession()

  const userDoc = await adminDb().collection('users').doc(decoded.uid).get()
  const role = userDoc.data()?.role
  const userSchoolId = userDoc.data()?.school_id

  if (role !== 'school_admin' && role !== 'super_admin') {
    throw new Error('Unauthorized')
  }
  if (role === 'school_admin' && userSchoolId !== schoolId) {
    throw new Error('Unauthorized: not your school')
  }

  const updateData: Record<string, unknown> = { updated_at: Timestamp.now() }
  if (data.name !== undefined) updateData.name = data.name
  if (data.email !== undefined) updateData.email = data.email
  if (data.phone !== undefined) updateData.phone = data.phone
  if (data.address !== undefined) updateData.address = data.address

  await adminDb().collection('schools').doc(schoolId).update(updateData)
  return { success: true }
}

export async function updateMyProfile(data: { fullName?: string; phone?: string }) {
  const decoded = await verifySession()

  const updateData: Record<string, unknown> = { updated_at: Timestamp.now() }
  if (data.fullName !== undefined) updateData.full_name = data.fullName
  if (data.phone !== undefined) updateData.phone = data.phone

  await adminDb().collection('users').doc(decoded.uid).update(updateData)
  return { success: true }
}
