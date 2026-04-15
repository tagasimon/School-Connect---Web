import { redirect } from 'next/navigation'
import { getSessionUid } from '@/lib/firebase/session'
import { getCurrentProfile } from '@/lib/firebase/queries'
import { adminDb } from '@/lib/firebase/admin'
import RepDetailPage from './rep-detail-page'

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

export default async function SalesRepDetailPage({
  params,
}: {
  params: Promise<{ repId: string }>
}) {
  const uid = await getSessionUid()
  if (!uid) redirect('/login')

  const profile = await getCurrentProfile(uid)
  if (!profile || profile.role !== 'super_admin') redirect('/login')

  const { repId } = await params

  // Get sales rep
  const repDoc = await adminDb().collection('sales_reps').doc(repId).get()
  if (!repDoc.exists) redirect('/super-admin/sales-reps')

  const rep = serializeTimestamps({ id: repDoc.id, ...repDoc.data() } as Record<string, unknown>)

  // Get contracts for this rep
  const contractsSnap = await adminDb()
    .collection('school_contracts')
    .where('sales_rep_id', '==', repId)
    .get()

  // Get school names for contracts
  const schoolIds = new Set(contractsSnap.docs.map(d => (d.data().school_id as string)))
  const schoolsSnap = await adminDb()
    .collection('schools')
    .where('__name__', 'in', [...schoolIds].slice(0, 10))
    .get()
  const schoolMap = new Map(schoolsSnap.docs.map(d => [d.id, d.data().name as string]))

  const contracts = contractsSnap.docs.map(doc => {
    const data = doc.data()
    return {
      id: doc.id,
      ...serializeTimestamps(data as Record<string, unknown>),
      schoolName: schoolMap.get(data.school_id as string) || 'Unknown',
    }
  })

  // Get payments for these contracts
  const contractIds = contractsSnap.docs.map(d => d.id)
  const paymentsSnap = await adminDb()
    .collection('contract_payments')
    .where('contract_id', 'in', contractIds.slice(0, 10))
    .get()

  const payments = paymentsSnap.docs.map(doc => serializeTimestamps({ id: doc.id, ...doc.data() } as Record<string, unknown>))

  // Calculate KPIs
  let totalInvoiced = 0
  let totalCollected = 0
  contracts.forEach((c: any) => {
    totalInvoiced += (c.agreed_amount as number) || 0
    const contractPayments = payments.filter(p => (p.contract_id as string) === c.id)
    totalCollected += contractPayments.reduce((sum, p) => sum + ((p as any).amount as number), 0)
  })

  return (
    <RepDetailPage
      rep={rep as any}
      contracts={contracts as any}
      payments={payments as any}
      totalInvoiced={totalInvoiced}
      totalCollected={totalCollected}
    />
  )
}
