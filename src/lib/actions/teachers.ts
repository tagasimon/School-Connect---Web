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
