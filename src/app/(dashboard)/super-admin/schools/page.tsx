import { redirect } from 'next/navigation'
import { getSessionUid } from '@/lib/firebase/session'
import { getCurrentProfile } from '@/lib/firebase/queries'
import { adminDb } from '@/lib/firebase/admin'
import { getSalesReps, getAllSchoolContracts } from '@/lib/actions/billing'
import { Timestamp } from 'firebase-admin/firestore'
import SchoolsPage from './schools-page'

// Helper to serialize Firestore Timestamps
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

export default async function SuperAdminSchoolsWrapper() {
  const uid = await getSessionUid()
  if (!uid) redirect('/login')

  const profile = await getCurrentProfile(uid)
  if (!profile) redirect('/login')

  const [schoolsSnap, salesReps, contracts] = await Promise.all([
    adminDb().collection('schools').orderBy('created_at', 'desc').get(),
    getSalesReps(),
    getAllSchoolContracts(),
  ])

  const schools = schoolsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))

  // Build contract map: schoolId -> contract
  const contractMap: Record<string, any> = {}
  contracts.forEach((c: any) => {
    contractMap[c.school_id] = c
  })

  // Get counts for each school
  const schoolsWithCounts = await Promise.all(
    schools.map(async (school) => {
      const [students, teachers, classes] = await Promise.all([
        adminDb().collection('students').where('school_id', '==', school.id).count().get(),
        adminDb().collection('users').where('school_id', '==', school.id).where('role', '==', 'teacher').count().get(),
        adminDb().collection('classes').where('school_id', '==', school.id).count().get(),
      ])
      const serializedSchool = serializeTimestamps({
        ...school,
        studentCount: students.data().count,
        teacherCount: teachers.data().count,
        classCount: classes.data().count,
      }) as any
      // Attach contract info
      const contract = contractMap[school.id]
      return {
        ...serializedSchool,
        contractId: contract?.id || null,
        assignedRepId: contract?.sales_rep_id || null,
        agreedAmount: contract?.agreed_amount || null,
        contractStatus: contract?.status || null,
      }
    })
  )

  const serializedSalesReps = salesReps.map((r: any) => serializeTimestamps({ id: r.id, ...(r as any) }))

  return <SchoolsPage schoolsData={schoolsWithCounts} salesReps={serializedSalesReps as any} />
}
