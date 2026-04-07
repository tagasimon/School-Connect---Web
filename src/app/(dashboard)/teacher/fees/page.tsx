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

  // Get students in this class
  const studentsSnap = await adminDb()
    .collection('students')
    .where('school_id', '==', profile.school_id)
    .where('class_id', '==', classData.id)
    .where('status', '==', 'active')
    .orderBy('full_name')
    .get()

  const students = studentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))

  // Get fee records for these students
  const studentIds = students.map(s => s.id)
  const fees: Record<string, any> = {}

  for (const studentId of studentIds) {
    const feeSnap = await adminDb()
      .collection('fees')
      .where('school_id', '==', profile.school_id)
      .where('student_id', '==', studentId)
      .limit(1)
      .get()

    if (!feeSnap.empty) {
      fees[studentId] = serializeTimestamps({ id: feeSnap.docs[0].id, ...feeSnap.docs[0].data() } as any)
    }
  }

  // Get payments for these students
  const payments: Record<string, any[]> = {}
  for (const studentId of studentIds) {
    const paySnap = await adminDb()
      .collection('payments')
      .where('school_id', '==', profile.school_id)
      .where('student_id', '==', studentId)
      .orderBy('created_at', 'desc')
      .get()

    payments[studentId] = paySnap.docs.map(doc => serializeTimestamps({ id: doc.id, ...doc.data() } as any))
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
