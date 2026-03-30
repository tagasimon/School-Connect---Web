'use server'

import { adminDb, adminAuth } from '@/lib/firebase/admin'
import { Timestamp } from 'firebase-admin/firestore'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

// Helper to serialize Firestore Timestamps
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

export async function createAnnouncement(
  schoolId: string,
  data: {
    title: string
    body: string
    target: 'school' | 'class'
    classId?: string | null
    smsSent: boolean
  }
) {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')?.value
  if (!sessionCookie) redirect('/login')

  const decoded = await adminAuth().verifySessionCookie(sessionCookie, true)

  const docRef = adminDb().collection('announcements').doc()
  await docRef.set({
    school_id: schoolId,
    class_id: data.target === 'class' ? data.classId : null,
    title: data.title,
    body: data.body,
    target: data.target,
    sms_sent: data.smsSent,
    created_by: decoded.uid,
    created_at: Timestamp.now(),
  })

  return docRef.id
}

export async function getAnnouncements(schoolId: string, limit = 20) {
  const snap = await adminDb()
    .collection('announcements')
    .where('school_id', '==', schoolId)
    .orderBy('created_at', 'desc')
    .limit(limit)
    .get()

  return snap.docs.map(doc => serializeTimestamps({ id: doc.id, ...doc.data() }) as any)
}

export async function getClassesForSchool(schoolId: string) {
  const snap = await adminDb()
    .collection('classes')
    .where('school_id', '==', schoolId)
    .get()

  return snap.docs.map(doc => ({ id: doc.id, name: doc.data().name }))
}
