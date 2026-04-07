import { redirect } from 'next/navigation'
import { getSessionUid } from '@/lib/firebase/session'
import { getCurrentProfile } from '@/lib/firebase/queries'
import { adminDb } from '@/lib/firebase/admin'
import { getSchoolContract, getContractPayments, getSalesReps } from '@/lib/actions/billing'
import SchoolBillingPage from './school-billing-page'

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

export default async function SchoolBillingPageWrapper({
  params,
}: {
  params: Promise<{ schoolId: string }>
}) {
  const uid = await getSessionUid()
  if (!uid) redirect('/login')

  const profile = await getCurrentProfile(uid)
  if (!profile) redirect('/login')

  const { schoolId } = await params

  const [schoolDoc, salesRepsSnap] = await Promise.all([
    adminDb().collection('schools').doc(schoolId).get(),
    adminDb().collection('sales_reps').where('is_active', '==', true).get(),
  ])

  const schoolName = schoolDoc.exists ? ((schoolDoc.data() as any).name as string) : 'Unknown School'
  const salesReps = salesRepsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))

  // Get contract and payments separately since contract may not exist
  const contract = await getSchoolContract(schoolId)
  const payments = contract ? await getContractPayments(contract.id as string) : []

  const serializedContract = contract ? serializeTimestamps({ ...contract, id: contract.id } as any) : null
  const serializedPayments = payments.map(p => serializeTimestamps({ ...p, id: p.id } as any))

  return (
    <SchoolBillingPage
      schoolId={schoolId}
      schoolName={schoolName}
      contract={serializedContract as any}
      payments={serializedPayments as any}
      salesReps={salesReps as any}
    />
  )
}
