import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const FROM_EMAIL = process.env.NOTIFICATION_FROM_EMAIL || 'notifications@schoolconnect.ug'

// ── SMS via Africa's Talking ─────────────────────────────────────────────

async function sendSMS(phone: string, message: string): Promise<{ success: boolean; error?: string }> {
  if (!process.env.AT_API_KEY) {
    console.warn('SMS skipped: AT_API_KEY not configured')
    return { success: false, error: 'SMS not configured' }
  }

  try {
    const res = await fetch('https://api.africastalking.com/version1/messaging', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        ApiKey: process.env.AT_API_KEY,
      },
      body: new URLSearchParams({
        username: process.env.AT_USERNAME || 'sandbox',
        to: phone,
        from: process.env.AT_SENDER_ID || 'SchoolConnect',
        message,
      }),
    })

    const data = await res.json() as any

    if (data.SMSMessageData?.recipients?.[0]?.status === 'Success') {
      return { success: true }
    }

    return {
      success: false,
      error: data.SMSMessageData?.recipients?.[0]?.errorMessage || 'SMS send failed',
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'SMS send failed' }
  }
}

// ── Email via Resend ─────────────────────────────────────────────────────

async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.warn('Email skipped: RESEND_API_KEY not configured')
    return { success: false, error: 'Email not configured' }
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    })
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Email send failed' }
  }
}

// ── Overdue Payment Notifications ────────────────────────────────────────

export async function notifyOverduePayment(data: {
  studentName: string
  className: string
  termName: string
  termYear: number
  balance: number
  deadline: string
  parentPhone: string | null
  teacherEmail: string | null
  schoolAdminEmail: string | null
  schoolName: string
}): Promise<{ sms: boolean; emails: number; errors: string[] }> {
  const errors: string[] = []
  let emailsSent = 0

  const deadlineFormatted = new Date(data.deadline).toLocaleDateString('en-UG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  // SMS to parent
  let smsSent = false
  if (data.parentPhone) {
    const smsResult = await sendSMS(
      data.parentPhone,
      `SchoolConnect: Overdue fees alert for ${data.studentName} (${data.className}). ` +
      `Balance: UGX ${data.balance.toLocaleString()}. Deadline was ${deadlineFormatted}. ` +
      `Please settle the payment at your earliest convenience.`
    )
    smsSent = smsResult.success
    if (!smsResult.success) errors.push(`SMS to parent failed: ${smsResult.error}`)
  }

  // Email to teacher
  if (data.teacherEmail) {
    const emailResult = await sendEmail(
      data.teacherEmail,
      `Overdue Fees Alert — ${data.studentName} (${data.className})`,
      `
        <h2>SchoolConnect — Overdue Fees Alert</h2>
        <p>Dear Teacher,</p>
        <p>This is to alert you that <strong>${data.studentName}</strong> in <strong>${data.className}</strong> has outstanding fee balances.</p>
        <table style="border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 4px 12px; border: 1px solid #ddd;"><strong>Student</strong></td><td style="padding: 4px 12px; border: 1px solid #ddd;">${data.studentName}</td></tr>
          <tr><td style="padding: 4px 12px; border: 1px solid #ddd;"><strong>Class</strong></td><td style="padding: 4px 12px; border: 1px solid #ddd;">${data.className}</td></tr>
          <tr><td style="padding: 4px 12px; border: 1px solid #ddd;"><strong>Term</strong></td><td style="padding: 4px 12px; border: 1px solid #ddd;">${data.termName} ${data.termYear}</td></tr>
          <tr><td style="padding: 4px 12px; border: 1px solid #ddd;"><strong>Outstanding Balance</strong></td><td style="padding: 4px 12px; border: 1px solid #ddd; color: #ef4444;"><strong>UGX ${data.balance.toLocaleString()}</strong></td></tr>
          <tr><td style="padding: 4px 12px; border: 1px solid #ddd;"><strong>Payment Deadline</strong></td><td style="padding: 4px 12px; border: 1px solid #ddd;">${deadlineFormatted}</td></tr>
        </table>
        <p>Please follow up with the student's parent regarding this outstanding payment.</p>
        <p style="color: #94a3b8; font-size: 12px;">— SchoolConnect, ${data.schoolName}</p>
      `
    )
    if (emailResult.success) emailsSent++
    else errors.push(`Email to teacher failed: ${emailResult.error}`)
  }

  // Email to school admin
  if (data.schoolAdminEmail) {
    const emailResult = await sendEmail(
      data.schoolAdminEmail,
      `OVERDUE: ${data.studentName} — UGX ${data.balance.toLocaleString()} Outstanding`,
      `
        <h2>SchoolConnect — Critical Overdue Fees Alert</h2>
        <p>Dear School Administrator,</p>
        <p>The following student has an <strong style="color: #ef4444;">overdue fee balance</strong> that exceeds the payment deadline.</p>
        <table style="border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 4px 12px; border: 1px solid #ddd;"><strong>Student</strong></td><td style="padding: 4px 12px; border: 1px solid #ddd;">${data.studentName}</td></tr>
          <tr><td style="padding: 4px 12px; border: 1px solid #ddd;"><strong>Class</strong></td><td style="padding: 4px 12px; border: 1px solid #ddd;">${data.className}</td></tr>
          <tr><td style="padding: 4px 12px; border: 1px solid #ddd;"><strong>Term</strong></td><td style="padding: 4px 12px; border: 1px solid #ddd;">${data.termName} ${data.termYear}</td></tr>
          <tr><td style="padding: 4px 12px; border: 1px solid #ddd;"><strong>Outstanding Balance</strong></td><td style="padding: 4px 12px; border: 1px solid #ddd; color: #ef4444;"><strong>UGX ${data.balance.toLocaleString()}</strong></td></tr>
          <tr><td style="padding: 4px 12px; border: 1px solid #ddd;"><strong>Payment Deadline</strong></td><td style="padding: 4px 12px; border: 1px solid #ddd;">${deadlineFormatted}</td></tr>
        </table>
        <p><strong>Action required:</strong> Follow up with the parent/guardian to ensure payment is collected.</p>
        <p style="color: #94a3b8; font-size: 12px;">— SchoolConnect, ${data.schoolName}</p>
      `
    )
    if (emailResult.success) emailsSent++
    else errors.push(`Email to school admin failed: ${emailResult.error}`)
  }

  return { sms: smsSent, emails: emailsSent, errors }
}

// ── Payment Confirmation Notifications ───────────────────────────────────

export async function notifyPaymentReceived(data: {
  studentName: string
  className: string
  amount: number
  receiptNumber: string
  parentPhone: string | null
  parentEmail: string | null
  schoolName: string
}): Promise<{ sms: boolean; emails: number; errors: string[] }> {
  const errors: string[] = []
  let emailsSent = 0

  // SMS to parent
  let smsSent = false
  if (data.parentPhone) {
    const smsResult = await sendSMS(
      data.parentPhone,
      `SchoolConnect: Payment received for ${data.studentName}. ` +
      `Amount: UGX ${data.amount.toLocaleString()}. Receipt: ${data.receiptNumber}. ` +
      `Thank you! — ${data.schoolName}`
    )
    smsSent = smsResult.success
    if (!smsResult.success) errors.push(`SMS to parent failed: ${smsResult.error}`)
  }

  return { sms: smsSent, emails: emailsSent, errors }
}
