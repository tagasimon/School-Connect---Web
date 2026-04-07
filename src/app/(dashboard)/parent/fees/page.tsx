import { redirect } from 'next/navigation'
import { getSessionUid } from '@/lib/firebase/session'
import { getCurrentProfile } from '@/lib/firebase/queries'
import { adminDb } from '@/lib/firebase/admin'
import ParentFeesPage from './parent-fees-page'

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

export default async function ParentFeesPageRoute() {
  const uid = await getSessionUid()
  if (!uid) redirect('/login')

  const profile = await getCurrentProfile(uid)
  if (!profile) redirect('/login')

  // Get all children linked to this parent
  const parentStudentSnap = await adminDb()
    .collection('parent_student')
    .where('parent_id', '==', uid)
    .get()

  if (parentStudentSnap.empty) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Child Fee Status</h1>
          <p className="text-slate-400 text-sm mt-1">No children linked to your account.</p>
        </div>
      </div>
    )
  }

  const childrenData = await Promise.all(
    parentStudentSnap.docs.map(async (doc) => {
      const data = doc.data()
      const studentId = data.student_id as string
      const isPrimary = data.is_primary as boolean
      const relationship = data.relationship as string | null

      const studentDoc = await adminDb().collection('students').doc(studentId).get()
      if (!studentDoc.exists) return null

      const studentData = studentDoc.data()
      const classId = studentData?.class_id as string

      const classDoc = await adminDb().collection('classes').doc(classId).get()
      const className = classDoc.exists ? ((classDoc.data() as any).name as string) : 'Unknown'

      // Get fee record
      const feeSnap = await adminDb()
        .collection('fees')
        .where('student_id', '==', studentId)
        .limit(1)
        .get()

      let fee: Record<string, any> | null = null
      if (!feeSnap.empty) {
        fee = serializeTimestamps({ id: feeSnap.docs[0].id, ...feeSnap.docs[0].data() } as any)
      }

      // Get payment history
      const paymentsSnap = await adminDb()
        .collection('payments')
        .where('student_id', '==', studentId)
        .orderBy('created_at', 'desc')
        .get()

      const payments = paymentsSnap.docs.map(d => serializeTimestamps({ id: d.id, ...d.data() } as any))

      return {
        studentId,
        fullName: studentData?.full_name || 'Unknown',
        studentNumber: studentData?.student_number as string | null,
        className,
        isPrimary,
        relationship,
        fee,
        payments,
      }
    })
  )

  const children = childrenData.filter(Boolean) as Array<{
    studentId: string
    fullName: string
    studentNumber: string | null
    className: string
    isPrimary: boolean
    relationship: string | null
    fee: Record<string, any> | null
    payments: Record<string, any>[]
  }>

  return <ParentFeesPage children={children} />
}
