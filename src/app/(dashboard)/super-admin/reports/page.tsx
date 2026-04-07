import { redirect } from 'next/navigation'
import { getSessionUid } from '@/lib/firebase/session'
import { getCurrentProfile } from '@/lib/firebase/queries'
import { getBillingOverview, getSalesReps, getAllContractPayments } from '@/lib/actions/billing'
import ReportsPage from './reports-page'

export default async function SuperAdminReportsPage() {
  const uid = await getSessionUid()
  if (!uid) redirect('/login')

  const profile = await getCurrentProfile(uid)
  if (!profile) redirect('/login')

  const [billing, salesReps, payments] = await Promise.all([
    getBillingOverview(),
    getSalesReps(),
    getAllContractPayments(),
  ])

  return (
    <ReportsPage
      billing={billing as any}
      salesReps={salesReps as any}
      payments={payments as any}
    />
  )
}
