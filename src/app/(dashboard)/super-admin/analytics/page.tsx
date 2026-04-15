import { redirect } from 'next/navigation'
import { getSessionUid } from '@/lib/firebase/session'
import { getCurrentProfile } from '@/lib/firebase/queries'
import { adminDb } from '@/lib/firebase/admin'
import { getAllContractPayments } from '@/lib/actions/billing'
import AnalyticsPage from './analytics-page'

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

export default async function SuperAdminAnalyticsPage() {
  const uid = await getSessionUid()
  if (!uid) redirect('/login')

  const profile = await getCurrentProfile(uid)
  if (!profile) redirect('/login')

  const [schoolsSnap, studentsSnap, teachersSnap, feesSnap, paymentsSnap] = await Promise.all([
    adminDb().collection('schools').get(),
    adminDb().collection('students').get(),
    adminDb().collection('users').where('role', '==', 'teacher').get(),
    adminDb().collection('fees').get(),
    getAllContractPayments(),
  ])

  const schools = schoolsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Record<string, unknown>)
  const totalStudents = studentsSnap.size
  const totalTeachers = teachersSnap.size
  const totalFees = feesSnap.docs.reduce((sum, doc) => {
    const data = doc.data()
    return sum + (data.total_amount as number || 0)
  }, 0)
  const totalCollected = feesSnap.docs.reduce((sum, doc) => {
    const data = doc.data()
    return sum + (data.amount_paid as number || 0)
  }, 0)

  const activeSchools = schools.filter(s => (s as any).subscription_status === 'active').length
  const trialSchools = schools.filter(s => (s as any).subscription_status === 'trial').length
  const inactiveSchools = schools.filter(s => (s as any).subscription_status === 'inactive').length

  const recentSchools = schools.filter(
    (s: any) => s.created_at && new Date(s.created_at as any) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  ).length

  const estimatedMonthlyRevenue = activeSchools * 50000

  // Monthly revenue from contract payments
  const serializedPayments = paymentsSnap.map(p => serializeTimestamps({ id: p.id, ...(p as any) }))
  const monthlyRevenueMap: Record<string, number> = {}
  serializedPayments.forEach(p => {
    const month = (p.payment_date as string)?.substring(0, 7)
    if (month) {
      monthlyRevenueMap[month] = (monthlyRevenueMap[month] || 0) + (p.amount as number)
    }
  })
  const monthlyRevenue = Object.entries(monthlyRevenueMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([month, collected]) => ({ month, collected }))

  // Top schools by student count
  const schoolStudentCounts: Record<string, number> = {}
  schools.forEach((school: any) => { schoolStudentCounts[school.id] = 0 })
  studentsSnap.docs.forEach(doc => {
    const data = doc.data()
    if (data.school_id && schoolStudentCounts[data.school_id as string] !== undefined) {
      schoolStudentCounts[data.school_id as string]++
    }
  })

  const topSchools = Object.entries(schoolStudentCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  const schoolNames = await Promise.all(
    topSchools.map(async ([schoolId]) => {
      const doc = await adminDb().collection('schools').doc(schoolId).get()
      return doc.exists ? doc.data()?.name : 'Unknown'
    })
  )

  return (
    <AnalyticsPage
      totalSchools={schools.length}
      totalStudents={totalStudents}
      totalTeachers={totalTeachers}
      totalFees={totalFees}
      totalCollected={totalCollected}
      activeSchools={activeSchools}
      trialSchools={trialSchools}
      inactiveSchools={inactiveSchools}
      recentSchools={recentSchools}
      estimatedMonthlyRevenue={estimatedMonthlyRevenue}
      monthlyRevenue={monthlyRevenue}
      topSchools={topSchools.map(([id, count], i) => ({ id, count, name: schoolNames[i] || 'Unknown' }))}
    />
  )
}
