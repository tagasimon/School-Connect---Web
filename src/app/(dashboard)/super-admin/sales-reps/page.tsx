import { redirect } from 'next/navigation'
import { getSessionUid } from '@/lib/firebase/session'
import { getCurrentProfile } from '@/lib/firebase/queries'
import { getSalesReps } from '@/lib/actions/billing'
import SalesRepsPage from './sales-reps-page'

export default async function SuperAdminSalesRepsPage() {
  const uid = await getSessionUid()
  if (!uid) redirect('/login')

  const profile = await getCurrentProfile(uid)
  if (!profile) redirect('/login')

  const reps = await getSalesReps()

  return <SalesRepsPage salesReps={reps as any} />
}
