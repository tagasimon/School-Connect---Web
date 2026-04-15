import { redirect } from 'next/navigation'
import { getSessionUid } from '@/lib/firebase/session'
import { getCurrentProfile } from '@/lib/firebase/queries'
import { adminDb } from '@/lib/firebase/admin'
import TeacherFeesPage from './teacher-fees-page'

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

/** Split an array into chunks of at most `size` (Firestore `in` limit is 30). */
function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size))
  return chunks
}

export default async function TeacherFeesPageRoute() {
  const uid = await getSessionUid()
  if (!uid) redirect('/login')

  const profile = await getCurrentProfile(uid)
  if (!profile?.school_id) redirect('/login')

  // Get the class assigned to this teacher
  const classSnap = await adminDb()
    .collection('classes')
    .where('school_id', '==', profile.school_id)
    .where('teacher_id', '==', uid)
    .limit(1)
    .get()

  if (classSnap.empty) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Class Fees</h1>
          <p className="text-slate-400 text-sm mt-1">You don't have a class assigned yet.</p>
        </div>
      </div>
    )
  }

  const classData = { id: classSnap.docs[0].id, ...(classSnap.docs[0].data() as any) }

  // Get students in this class — one query, filter active in JS
  const studentsSnap = await adminDb()
    .collection('students')
    .where('school_id', '==', profile.school_id)
    .where('class_id', '==', classData.id)
    .get()

  const students = studentsSnap.docs
    .filter(d => (d.data().status as string) === 'active')
    .map(doc => ({
      id: doc.id,
      full_name: doc.data().full_name as string,
      student_number: doc.data().student_number as string | null,
    }))

  const studentIds = students.map(s => s.id)
  const fees: Record<string, any> = {}
  const payments: Record<string, any[]> = {}

  if (studentIds.length > 0) {
    // Batch-fetch fees and payments in parallel — one round-trip each
    // instead of N sequential queries per student.
    const [feeSnaps, paymentSnaps] = await Promise.all([
      Promise.all(
        chunk(studentIds, 30).map(ids =>
          adminDb()
            .collection('fees')
            .where('school_id', '==', profile.school_id)
            .where('student_id', 'in', ids)
            .get()
        )
      ),
      Promise.all(
        chunk(studentIds, 30).map(ids =>
          adminDb()
            .collection('payments')
            .where('school_id', '==', profile.school_id)
            .where('student_id', 'in', ids)
            .get()
        )
      ),
    ])

    // Build fees map — keep the most recent fee per student if duplicates exist
    for (const snap of feeSnaps) {
      for (const doc of snap.docs) {
        const data = doc.data()
        const sid = data.student_id as string
        if (!fees[sid]) {
          fees[sid] = serializeTimestamps({ id: doc.id, ...data } as any)
        }
      }
    }

    // Build payments map, then sort each student's payments newest-first
    for (const snap of paymentSnaps) {
      for (const doc of snap.docs) {
        const data = doc.data()
        const sid = data.student_id as string
        if (!payments[sid]) payments[sid] = []
        payments[sid].push(serializeTimestamps({ id: doc.id, ...data } as any))
      }
    }
    for (const sid of Object.keys(payments)) {
      payments[sid].sort((a, b) => {
        const aDate = (a.created_at ?? a.payment_date ?? '') as string
        const bDate = (b.created_at ?? b.payment_date ?? '') as string
        return bDate > aDate ? 1 : bDate < aDate ? -1 : 0
      })
    }
  }

  return (
    <TeacherFeesPage
      className={classData.name as string}
      students={students as any}
      fees={fees}
      payments={payments}
    />
  )
}
