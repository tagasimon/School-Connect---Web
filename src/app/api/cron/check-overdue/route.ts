import { NextRequest, NextResponse } from 'next/server'
import { getOverduePayments } from '@/lib/actions/fees'
import { notifyOverduePayment } from '@/lib/notifications'
import { adminDb } from '@/lib/firebase/admin'

/**
 * POST /api/cron/check-overdue
 * Checks for overdue payments and sends notifications.
 * Can be triggered manually or via a cron service (e.g., Vercel Cron, EasyCron).
 * Protected by a simple secret token.
 */
export async function POST(request: NextRequest) {
  // Simple auth check
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get all schools
  const schoolsSnap = await adminDb().collection('schools').get()
  const results: any[] = []

  for (const schoolDoc of schoolsSnap.docs) {
    const schoolId = schoolDoc.id
    const schoolName = schoolDoc.data().name as string

    // Get school admin profile for email
    const adminSnap = await adminDb()
      .collection('users')
      .where('school_id', '==', schoolId)
      .where('role', '==', 'school_admin')
      .limit(1)
      .get()

    const schoolAdminEmail = adminSnap.empty ? null : (adminSnap.docs[0].data().email as string)

    const overdueItems = await getOverduePayments(schoolId)

    for (const item of overdueItems) {
      // Get teacher email
      let teacherEmail: string | null = null
      if (item.teacherId) {
        const teacherDoc = await adminDb().collection('users').doc(item.teacherId).get()
        if (teacherDoc.exists) {
          teacherEmail = ((teacherDoc.data() as any).email as string) || null
        }
      }

      const notificationResult = await notifyOverduePayment({
        studentName: item.studentName,
        className: item.className,
        termName: item.termName,
        termYear: item.termYear,
        balance: item.balance,
        deadline: item.deadline,
        parentPhone: item.parentPhone,
        teacherEmail,
        schoolAdminEmail,
        schoolName,
      })

      results.push({
        studentId: item.studentId,
        studentName: item.studentName,
        className: item.className,
        balance: item.balance,
        notifications: notificationResult,
      })
    }
  }

  return NextResponse.json({
    checked: results.length,
    results,
  })
}

// Also allow GET for manual testing (no notifications sent)
export async function GET(request: NextRequest) {
  const schoolsSnap = await adminDb().collection('schools').get()
  const results: any[] = []

  for (const schoolDoc of schoolsSnap.docs) {
    const schoolId = schoolDoc.id
    const overdueItems = await getOverduePayments(schoolId)
    results.push(...overdueItems.map(item => ({
      schoolId,
      ...item,
    })))
  }

  return NextResponse.json({
    count: results.length,
    overdue: results,
  })
}
