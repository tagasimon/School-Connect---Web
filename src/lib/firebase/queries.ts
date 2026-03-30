import type { Query, DocumentData, Timestamp } from 'firebase-admin/firestore'
import { adminDb } from './admin'
import type { ProfileDoc, FeeDoc, ClassDoc, SchoolDoc } from '@/types'

// Helper to serialize Firestore Timestamps to ISO strings
function serializeTimestamps<T extends Record<string, unknown>>(data: T): T {
  if (!data) return data
  
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value === 'object') {
      if ('_seconds' in value && typeof (value as any).seconds === 'number') {
        // Firestore Timestamp -> ISO string
        result[key] = new Date((value as any).seconds * 1000).toISOString()
      } else if (typeof value === 'object') {
        // Recursively handle nested objects
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

// ── Profile ────────────────────────────────────────────────────────────────

export async function getCurrentProfile(uid: string): Promise<ProfileDoc | null> {
  const doc = await adminDb().collection('users').doc(uid).get()
  if (!doc.exists) return null
  return { id: doc.id, ...serializeTimestamps(doc.data() as Record<string, unknown>) } as ProfileDoc
}

// ── Fees ───────────────────────────────────────────────────────────────────

export async function getFeesBySchool(schoolId: string): Promise<FeeDoc[]> {
  const snap = await adminDb()
    .collection('fees')
    .where('school_id', '==', schoolId)
    .get()
  return snap.docs.map(d => ({ id: d.id, ...d.data() })) as FeeDoc[]
}

// ── Classes ────────────────────────────────────────────────────────────────

/** Classes assigned to a teacher, with denormalised term_name. */
export async function getClassesForTeacher(
  schoolId: string,
  teacherId: string
): Promise<Array<Pick<ClassDoc, 'id' | 'name' | 'term_name'>>> {
  const snap = await adminDb()
    .collection('classes')
    .where('school_id', '==', schoolId)
    .where('teacher_id', '==', teacherId)
    .get()
  return snap.docs.map(d => {
    const data = d.data()
    return { id: d.id, name: data.name as string, term_name: (data.term_name as string) ?? null }
  })
}

// ── Schools ────────────────────────────────────────────────────────────────

export async function getRecentSchools(
  limit = 5
): Promise<Array<Pick<SchoolDoc, 'id' | 'name' | 'subscription_status' | 'created_at'>>> {
  const snap = await adminDb()
    .collection('schools')
    .orderBy('created_at', 'desc')
    .limit(limit)
    .get()
  return snap.docs.map(d => {
    const data = d.data()
    return {
      id: d.id,
      name: data.name as string,
      subscription_status: data.subscription_status as SchoolDoc['subscription_status'],
      created_at: data.created_at as string,
    }
  })
}

// ── Counts ─────────────────────────────────────────────────────────────────

/**
 * Count documents in `collectionName` matching all provided `filters`.
 * Pass an empty object to count the full collection.
 *
 * Note: compound queries (multiple where clauses + different fields) may require
 * composite indexes in the Firebase console.
 */
export async function countCollection(
  collectionName: string,
  filters: Record<string, string>
): Promise<number> {
  let q: Query<DocumentData> = adminDb().collection(collectionName)
  for (const [field, value] of Object.entries(filters)) {
    q = q.where(field, '==', value)
  }
  const snap = await q.count().get()
  return snap.data().count
}
