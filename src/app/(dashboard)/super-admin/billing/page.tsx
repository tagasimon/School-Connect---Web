import { redirect } from 'next/navigation'
import { getSessionUid } from '@/lib/firebase/session'
import { getCurrentProfile } from '@/lib/firebase/queries'
import { getBillingOverview } from '@/lib/actions/billing'
import BillingPage from './billing-page'

export default async function SuperAdminBillingPage() {
  const uid = await getSessionUid()
  if (!uid) redirect('/login')

  const profile = await getCurrentProfile(uid)
  if (!profile) redirect('/login')

  const billing = await getBillingOverview()

  return <BillingPage billing={billing as any} />
}
