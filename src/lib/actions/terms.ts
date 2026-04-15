'use server'

import { adminDb, adminAuth } from '@/lib/firebase/admin'
import { Timestamp } from 'firebase-admin/firestore'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

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

async function verifySession() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')?.value
  if (!sessionCookie) redirect('/login')
  return adminAuth().verifySessionCookie(sessionCookie, true)
}

// ── Terms CRUD ─────────────────────────────────────────────────────────────

export async function createTerm(
  schoolId: string,
  data: { name: string; year: number; startDate: string; endDate: string }
) {
  await verifySession()

  // Validate name
  const validNames = ['Term 1', 'Term 2', 'Term 3']
  if (!validNames.includes(data.name) && data.name.trim().length < 2) {
    return { error: 'Term name must be "Term 1", "Term 2", "Term 3", or a custom name (min 2 chars)' }
  }

  // Validate dates
  const start = new Date(data.startDate)
  const end = new Date(data.endDate)
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { error: 'Invalid date format' }
  }
  if (start >= end) {
    return { error: 'Start date must be before end date' }
  }

  // Check for duplicate name + year
  const existing = await adminDb()
    .collection('terms')
    .where('school_id', '==', schoolId)
    .where('name', '==', data.name)
    .where('year', '==', data.year)
    .limit(1)
    .get()

  if (!existing.empty) {
    return { error: `${data.name} ${data.year} already exists for this school` }
  }

  const ref = adminDb().collection('terms').doc()
  await ref.set({
    school_id: schoolId,
    name: data.name,
    year: data.year,
    start_date: data.startDate,
    end_date: data.endDate,
    is_current: false,
    created_at: Timestamp.now(),
    updated_at: Timestamp.now(),
  })

  return { success: true, id: ref.id }
}

export async function setCurrentTerm(schoolId: string, termId: string) {
  await verifySession()

  const batch = adminDb().batch()

  // Set all other terms to is_current=false
  const allTermsSnap = await adminDb()
    .collection('terms')
    .where('school_id', '==', schoolId)
    .get()

  allTermsSnap.docs.forEach(doc => {
    batch.update(doc.ref, { is_current: false, updated_at: Timestamp.now() })
  })

  // Set the selected term to is_current=true
  const termRef = adminDb().collection('terms').doc(termId)
  batch.update(termRef, { is_current: true, updated_at: Timestamp.now() })

  await batch.commit()
  return { success: true }
}

export async function updateTerm(
  termId: string,
  data: { name?: string; startDate?: string; endDate?: string }
) {
  await verifySession()

  const updates: Record<string, unknown> = { updated_at: Timestamp.now() }
  if (data.name !== undefined) {
    const validNames = ['Term 1', 'Term 2', 'Term 3']
    if (!validNames.includes(data.name) && data.name.trim().length < 2) {
      return { error: 'Term name must be "Term 1", "Term 2", "Term 3", or a custom name (min 2 chars)' }
    }
    updates.name = data.name
  }
  if (data.startDate !== undefined) {
    const start = new Date(data.startDate)
    if (isNaN(start.getTime())) return { error: 'Invalid start date' }
    updates.start_date = data.startDate
  }
  if (data.endDate !== undefined) {
    const end = new Date(data.endDate)
    if (isNaN(end.getTime())) return { error: 'Invalid end date' }
    updates.end_date = data.endDate
  }

  // Validate start < end if both provided
  if (data.startDate && data.endDate) {
    const start = new Date(data.startDate)
    const end = new Date(data.endDate)
    if (start >= end) return { error: 'Start date must be before end date' }
  }

  await adminDb().collection('terms').doc(termId).update(updates)
  return { success: true }
}

export async function deleteTerm(termId: string, schoolId: string) {
  await verifySession()

  // Check: no classes reference this term_id
  const classesUsing = await adminDb()
    .collection('classes')
    .where('school_id', '==', schoolId)
    .where('term_id', '==', termId)
    .limit(1)
    .get()

  if (!classesUsing.empty) {
    return { error: 'Term is in use by classes and cannot be deleted' }
  }

  // Check: no fee_structures reference this term_id
  const feesUsing = await adminDb()
    .collection('fee_structures')
    .where('school_id', '==', schoolId)
    .where('term_id', '==', termId)
    .limit(1)
    .get()

  if (!feesUsing.empty) {
    return { error: 'Term is in use by fee structures and cannot be deleted' }
  }

  await adminDb().collection('terms').doc(termId).delete()
  return { success: true }
}

export async function getTermsBySchool(schoolId: string) {
  await verifySession()

  const snap = await adminDb()
    .collection('terms')
    .where('school_id', '==', schoolId)
    .get()

  return snap.docs.map(doc => serializeTimestamps({ id: doc.id, ...doc.data() } as Record<string, unknown>))
}
