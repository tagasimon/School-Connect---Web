import { redirect } from 'next/navigation'
import { getSessionUid } from '@/lib/firebase/session'
import { getCurrentProfile } from '@/lib/firebase/queries'
import { getBillingOverview, getSalesReps, getAllContractPayments } from '@/lib/actions/billing'
import ReportsPage from './reports-page'

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

export default async function SuperAdminReportsPage() {
  const uid = await getSessionUid()
  if (!uid) redirect('/login')

  const profile = await getCurrentProfile(uid)
  if (!profile) redirect('/login')

  const [billing, salesRepsSnap, paymentsSnap] = await Promise.all([
    getBillingOverview(),
    getSalesReps(),
    getAllContractPayments(),
  ])

  const serializedSalesReps = salesRepsSnap.map(r => serializeTimestamps({ id: r.id, ...(r as any) }))
  const serializedPayments = paymentsSnap.map(p => serializeTimestamps({ id: p.id, ...(p as any) }))

  return (
    <ReportsPage
      billing={billing as any}
      salesReps={serializedSalesReps as any}
      payments={serializedPayments as any}
    />
  )
}
