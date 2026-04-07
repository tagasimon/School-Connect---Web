import { redirect } from 'next/navigation'
import { getSessionUid } from '@/lib/firebase/session'
import { getCurrentProfile } from '@/lib/firebase/queries'
import { getBillingOverview } from '@/lib/actions/billing'
import BillingPage from './billing-page'

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

export default async function SuperAdminBillingPage() {
  const uid = await getSessionUid()
  if (!uid) redirect('/login')

  const profile = await getCurrentProfile(uid)
  if (!profile) redirect('/login')

  const billing = await getBillingOverview()

  // Serialize nested timestamps in billing data
  const serializedBilling = {
    ...billing,
    billingBySchool: (billing as any).billingBySchool?.map((s: any) => serializeTimestamps(s)) || [],
  }

  return <BillingPage billing={serializedBilling as any} />
}
