'use server'

import { adminDb, adminAuth } from '@/lib/firebase/admin'
import { Timestamp } from 'firebase-admin/firestore'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

// ── Helpers ────────────────────────────────────────────────────────────────

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

async function verifySession() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')?.value
  if (!sessionCookie) redirect('/login')
  return adminAuth().verifySessionCookie(sessionCookie, true)
}

// ── Sales Reps ─────────────────────────────────────────────────────────────

export async function createSalesRep(data: {
  fullName: string
  email?: string
  phone?: string
}) {
  await verifySession()

  const ref = adminDb().collection('sales_reps').doc()
  await ref.set({
    full_name: data.fullName,
    email: data.email || null,
    phone: data.phone || null,
    is_active: true,
    created_at: Timestamp.now(),
    updated_at: Timestamp.now(),
  })

  return { success: true, id: ref.id }
}

export async function updateSalesRep(id: string, data: {
  fullName?: string
  email?: string
  phone?: string
  isActive?: boolean
}) {
  await verifySession()

  const updates: Record<string, unknown> = { updated_at: Timestamp.now() }
  if (data.fullName !== undefined) updates.full_name = data.fullName
  if (data.email !== undefined) updates.email = data.email
  if (data.phone !== undefined) updates.phone = data.phone
  if (data.isActive !== undefined) updates.is_active = data.isActive

  await adminDb().collection('sales_reps').doc(id).update(updates)
  return { success: true }
}

export async function deleteSalesRep(id: string) {
  await verifySession()
  await adminDb().collection('sales_reps').doc(id).delete()
  return { success: true }
}

export async function getSalesReps() {
  const snap = await adminDb()
    .collection('sales_reps')
    .orderBy('full_name')
    .get()

  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
}

// ── School Contracts ───────────────────────────────────────────────────────

export async function upsertSchoolContract(
  schoolId: string,
  data: {
    agreedAmount: number
    status?: 'draft' | 'active' | 'expired' | 'cancelled'
    contractPersonName?: string
    contractPersonPhone?: string
    contractPersonEmail?: string
    contractPersonRole?: string
    salesRepId?: string
    startDate?: string  // ISO date
    endDate?: string    // ISO date
    notes?: string
  }
) {
  const decoded = await verifySession()

  // Check if contract exists
  const existingSnap = await adminDb()
    .collection('school_contracts')
    .where('school_id', '==', schoolId)
    .limit(1)
    .get()

  const contractData: Record<string, unknown> = {
    school_id: schoolId,
    agreed_amount: data.agreedAmount,
    status: data.status || 'draft',
    contract_person_name: data.contractPersonName || null,
    contract_person_phone: data.contractPersonPhone || null,
    contract_person_email: data.contractPersonEmail || null,
    contract_person_role: data.contractPersonRole || null,
    sales_rep_id: data.salesRepId || null,
    start_date: data.startDate || null,
    end_date: data.endDate || null,
    notes: data.notes || null,
    created_by: decoded.uid,
    updated_at: Timestamp.now(),
  }

  if (existingSnap.empty) {
    contractData.created_at = Timestamp.now()
    const ref = adminDb().collection('school_contracts').doc()
    await ref.set(contractData)
    return { success: true, id: ref.id, created: true }
  } else {
    await adminDb().collection('school_contracts').doc(existingSnap.docs[0].id).update(contractData)
    return { success: true, id: existingSnap.docs[0].id, created: false }
  }
}

export async function getSchoolContract(schoolId: string) {
  const snap = await adminDb()
    .collection('school_contracts')
    .where('school_id', '==', schoolId)
    .limit(1)
    .get()

  if (snap.empty) return null
  const doc = snap.docs[0]
  return { id: doc.id, ...doc.data() }
}

export async function getAllSchoolContracts() {
  const snap = await adminDb()
    .collection('school_contracts')
    .orderBy('created_at', 'desc')
    .get()

  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
}

// ── Contract Payments ──────────────────────────────────────────────────────

export async function recordContractPayment(
  schoolId: string,
  contractId: string,
  data: {
    amount: number
    paymentDate?: string  // ISO date
    reference?: string
    notes?: string
  }
) {
  const decoded = await verifySession()

  // Validate payment doesn't exceed outstanding balance
  const contractSnap = await adminDb()
    .collection('school_contracts')
    .doc(contractId)
    .get()

  if (!contractSnap.exists) {
    return { error: 'Contract not found' }
  }

  const contract = contractSnap.data()
  const agreedAmount = contract?.agreed_amount as number

  // Calculate total paid
  const paymentsSnap = await adminDb()
    .collection('contract_payments')
    .where('contract_id', '==', contractId)
    .get()

  const totalPaid = paymentsSnap.docs.reduce((sum, d) => sum + (d.data().amount as number), 0)

  if (totalPaid + data.amount > agreedAmount) {
    return { error: `Payment exceeds outstanding balance. Remaining: UGX ${(agreedAmount - totalPaid).toLocaleString()}` }
  }

  const ref = adminDb().collection('contract_payments').doc()
  await ref.set({
    contract_id: contractId,
    school_id: schoolId,
    amount: data.amount,
    payment_date: data.paymentDate || new Date().toISOString().split('T')[0],
    reference: data.reference || null,
    notes: data.notes || null,
    recorded_by: decoded.uid,
    created_at: Timestamp.now(),
  })

  return { success: true, id: ref.id }
}

export async function getContractPayments(contractId: string) {
  const snap = await adminDb()
    .collection('contract_payments')
    .where('contract_id', '==', contractId)
    .orderBy('payment_date', 'desc')
    .get()

  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
}

export async function getAllContractPayments() {
  const snap = await adminDb()
    .collection('contract_payments')
    .orderBy('payment_date', 'desc')
    .get()

  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
}

// ── Billing Overview ───────────────────────────────────────────────────────

export async function getBillingOverview() {
  const [contractsSnap, schoolsSnap, salesRepsSnap, paymentsSnap] = await Promise.all([
    adminDb().collection('school_contracts').get(),
    adminDb().collection('schools').get(),
    adminDb().collection('sales_reps').where('is_active', '==', true).get(),
    adminDb().collection('contract_payments').get(),
  ])

  const schoolMap = new Map(schoolsSnap.docs.map(d => [d.id, d.data().name]))
  const salesRepMap = new Map(salesRepsSnap.docs.map(d => [d.id, d.data()]))

  const billingBySchool = contractsSnap.docs.map(doc => {
    const contract = doc.data()
    const schoolId = contract.school_id as string
    const schoolName = schoolMap.get(schoolId) as string || 'Unknown'
    const agreedAmount = contract.agreed_amount as number
    const salesRepId = contract.sales_rep_id as string | null
    const salesRep = salesRepId ? (salesRepMap.get(salesRepId)?.full_name as string || null) : null

    // Get payments for this contract
    const contractPayments = paymentsSnap.docs
      .filter(d => (d.data().contract_id as string) === doc.id)
      .map(d => ({ id: d.id, ...(d.data() as any) }))

    const totalPaid = contractPayments.reduce((sum, p) => sum + ((p as any).amount as number), 0)
    const pending = agreedAmount - totalPaid

    return {
      contractId: doc.id,
      schoolId,
      schoolName,
      agreedAmount,
      totalPaid,
      pending,
      status: contract.status as string,
      salesRep,
      startDate: contract.start_date as string | null,
      endDate: contract.end_date as string | null,
      payments: contractPayments,
    }
  })

  const totalInvoiced = billingBySchool.reduce((sum, b) => sum + b.agreedAmount, 0)
  const totalCollected = billingBySchool.reduce((sum, b) => sum + b.totalPaid, 0)
  const totalPending = billingBySchool.reduce((sum, b) => sum + b.pending, 0)

  // Sales rep performance
  const salesRepPerformance: Record<string, { name: string; invoiced: number; collected: number; pending: number; schools: number }> = {}
  salesRepsSnap.docs.forEach(doc => {
    const repId = doc.id
    const repName = (doc.data().full_name as string) || 'Unknown'
    const repSchools = billingBySchool.filter(b => {
      const contract = contractsSnap.docs.find(d => d.id === b.contractId)
      return contract && (contract.data().sales_rep_id as string) === repId
    })

    salesRepPerformance[repId] = {
      name: repName,
      invoiced: repSchools.reduce((sum, b) => sum + b.agreedAmount, 0),
      collected: repSchools.reduce((sum, b) => sum + b.totalPaid, 0),
      pending: repSchools.reduce((sum, b) => sum + b.pending, 0),
      schools: repSchools.length,
    }
  })

  return {
    totalInvoiced,
    totalCollected,
    totalPending,
    billingBySchool,
    salesRepPerformance,
    collectionRate: totalInvoiced > 0 ? ((totalCollected / totalInvoiced) * 100).toFixed(1) : '0',
  }
}
