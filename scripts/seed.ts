/**
 * Seed script — populates Firestore with realistic dummy data for SchoolConnect.
 * Uses Firestore REST API to avoid gRPC/protobuf issues.
 * Run: npx tsx scripts/seed.ts
 */

import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'

// ── Init ──────────────────────────────────────────────────────────────────────

function init() {
  if (getApps().length) return
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      privateKey: process.env.FIREBASE_PRIVATE_KEY!
        .replace(/^"|"$/g, '')
        .replace(/\\n/g, '\n')
        .trim(),
    }),
  })
}
init()

const db = getFirestore()
const auth = getAuth()

// ── Helpers ───────────────────────────────────────────────────────────────────

function now() { return Timestamp.now() }

function dateStr(y: number, m: number, d: number) {
  return Timestamp.fromDate(new Date(`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`))
}

/** Create or overwrite a Firebase Auth user and return its UID. */
async function upsertUser(email: string, password: string, displayName: string): Promise<string> {
  try {
    const existing = await auth.getUserByEmail(email)
    await auth.updateUser(existing.uid, { displayName, password })
    console.log(`  ↻ updated auth user: ${email}`)
    return existing.uid
  } catch {
    const created = await auth.createUser({ email, password, displayName })
    console.log(`  + created auth user: ${email}`)
    return created.uid
  }
}

/** Write a Firestore doc by explicit ID. */
async function set(col: string, id: string, data: Record<string, unknown>) {
  await db.collection(col).doc(id).set(data)
  console.log(`    → wrote ${col}/${id}`)
}

// ── 1. Schools ────────────────────────────────────────────────────────────────

const SCHOOL_ID = 'school_stjohns'

async function seedSchool() {
  console.log('\n── Schools')
  await set('schools', SCHOOL_ID, {
    name: "St John's Primary School",
    address: 'Plot 14, Bombo Road, Kampala, Uganda',
    phone: '+256414123456',
    email: 'info@stjohnsprimary.ug',
    subscription_status: 'active',
    subscription_plan: 'standard',
    created_at: dateStr(2024, 1, 15),
    updated_at: now(),
  })
}

// ── 2. Auth Users + Profiles ──────────────────────────────────────────────────

const USERS: Array<{
  email: string; password: string; name: string
  role: string; schoolId: string | null; phone: string | null
}> = [
  { email: 'superadmin@schoolconnect.ug', password: 'SuperAdmin123!', name: 'Moses Ssekandi',   role: 'super_admin',  schoolId: null,      phone: '+256772000001' },
  { email: 'admin@stjohns.ug',            password: 'Admin1234!',     name: 'Grace Nakamya',   role: 'school_admin', schoolId: SCHOOL_ID, phone: '+256772000002' },
  { email: 'teacher1@stjohns.ug',         password: 'Teacher123!',    name: 'Robert Ochieng',  role: 'teacher',      schoolId: SCHOOL_ID, phone: '+256772000003' },
  { email: 'teacher2@stjohns.ug',         password: 'Teacher123!',    name: 'Agnes Namutebi',  role: 'teacher',      schoolId: SCHOOL_ID, phone: '+256772000004' },
  { email: 'accountant@stjohns.ug',       password: 'Accounts123!',   name: 'Paul Muwonge',    role: 'accountant',   schoolId: SCHOOL_ID, phone: '+256772000005' },
  { email: 'parent1@gmail.com',           password: 'Parent123!',     name: 'James Kalule',    role: 'parent',       schoolId: null,      phone: '+256701000001' },
  { email: 'parent2@gmail.com',           password: 'Parent123!',     name: 'Fatuma Nakato',   role: 'parent',       schoolId: null,      phone: '+256701000002' },
  { email: 'parent3@gmail.com',           password: 'Parent123!',     name: 'David Ssebugwaawo', role: 'parent',     schoolId: null,      phone: '+256701000003' },
]

const uids: Record<string, string> = {}

async function seedUsers() {
  console.log('\n── Users (Auth + Firestore)')
  for (const u of USERS) {
    const uid = await upsertUser(u.email, u.password, u.name)
    uids[u.email] = uid
    await set('users', uid, {
      email: u.email,
      full_name: u.name,
      phone: u.phone,
      role: u.role,
      school_id: u.schoolId,
      created_at: now(),
      updated_at: now(),
    })
  }
}

// ── 3. Terms ──────────────────────────────────────────────────────────────────

const TERM_ID = 'term_2026_t2'

async function seedTerms() {
  console.log('\n── Terms')
  await set('terms', TERM_ID, {
    school_id: SCHOOL_ID,
    name: 'Term 2',
    year: 2026,
    start_date: dateStr(2026, 5, 5),
    end_date: dateStr(2026, 8, 15),
    is_current: true,
    created_at: now(),
  })
}

// ── 4. Classes ────────────────────────────────────────────────────────────────

const CLASS_IDS = { P3A: 'class_p3a', P4B: 'class_p4b', P5C: 'class_p5c' }

async function seedClasses() {
  console.log('\n── Classes')
  const classes = [
    { id: CLASS_IDS.P3A, name: 'P3A', teacher_id: uids['teacher1@stjohns.ug'] },
    { id: CLASS_IDS.P4B, name: 'P4B', teacher_id: uids['teacher1@stjohns.ug'] },
    { id: CLASS_IDS.P5C, name: 'P5C', teacher_id: uids['teacher2@stjohns.ug'] },
  ]
  for (const c of classes) {
    await set('classes', c.id, {
      school_id: SCHOOL_ID,
      name: c.name,
      term_id: TERM_ID,
      term_name: 'Term 2',
      teacher_id: c.teacher_id,
      created_at: now(),
    })
  }
}

// ── 5. Subjects ───────────────────────────────────────────────────────────────

const SUBJECT_IDS: Record<string, string[]> = { P3A: [], P4B: [], P5C: [] }

async function seedSubjects() {
  console.log('\n── Subjects')
  const subjectsByClass: Record<string, string[]> = {
    [CLASS_IDS.P3A]: ['English', 'Mathematics', 'Science', 'Social Studies'],
    [CLASS_IDS.P4B]: ['English', 'Mathematics', 'Science', 'Religious Education'],
    [CLASS_IDS.P5C]: ['English', 'Mathematics', 'Science', 'History & Geography'],
  }
  const classKeyMap: Record<string, string> = {
    [CLASS_IDS.P3A]: 'P3A', [CLASS_IDS.P4B]: 'P4B', [CLASS_IDS.P5C]: 'P5C',
  }
  for (const [classId, subjects] of Object.entries(subjectsByClass)) {
    for (const name of subjects) {
      const ref = db.collection('subjects').doc()
      await ref.set({ school_id: SCHOOL_ID, class_id: classId, name, created_at: now() })
      SUBJECT_IDS[classKeyMap[classId]].push(ref.id)
      console.log(`    → subject ${classKeyMap[classId]} / ${name} (${ref.id})`)
    }
  }
}

// ── 6. Students ───────────────────────────────────────────────────────────────

const STUDENT_IDS: string[] = []

const STUDENT_DATA = [
  // P3A — 5 students
  { name: 'Brian Ssekandi',    num: 'P3A/001', dob: '2018-03-12', gender: 'male',   classKey: 'P3A' },
  { name: 'Sharon Nalubega',   num: 'P3A/002', dob: '2018-07-22', gender: 'female', classKey: 'P3A' },
  { name: 'Ivan Mugisha',      num: 'P3A/003', dob: '2017-11-05', gender: 'male',   classKey: 'P3A' },
  { name: 'Brenda Nakirya',    num: 'P3A/004', dob: '2018-01-30', gender: 'female', classKey: 'P3A' },
  { name: 'Collin Opolot',     num: 'P3A/005', dob: '2018-09-14', gender: 'male',   classKey: 'P3A' },
  // P4B — 4 students
  { name: 'Lydia Atim',        num: 'P4B/001', dob: '2017-04-18', gender: 'female', classKey: 'P4B' },
  { name: 'Ronald Kato',       num: 'P4B/002', dob: '2016-12-03', gender: 'male',   classKey: 'P4B' },
  { name: 'Patricia Nakiganda',num: 'P4B/003', dob: '2017-06-25', gender: 'female', classKey: 'P4B' },
  { name: 'Emmanuel Okello',   num: 'P4B/004', dob: '2017-08-11', gender: 'male',   classKey: 'P4B' },
  // P5C — 4 students
  { name: 'Christine Namutebi',num: 'P5C/001', dob: '2016-02-09', gender: 'female', classKey: 'P5C' },
  { name: 'Peter Waiswa',      num: 'P5C/002', dob: '2015-10-17', gender: 'male',   classKey: 'P5C' },
  { name: 'Annet Nantaba',     num: 'P5C/003', dob: '2016-05-28', gender: 'female', classKey: 'P5C' },
  { name: 'Joseph Lubega',     num: 'P5C/004', dob: '2015-07-04', gender: 'male',   classKey: 'P5C' },
]

const classKeyToId: Record<string, string> = {
  P3A: CLASS_IDS.P3A, P4B: CLASS_IDS.P4B, P5C: CLASS_IDS.P5C,
}

async function seedStudents() {
  console.log('\n── Students')
  for (const s of STUDENT_DATA) {
    const ref = db.collection('students').doc()
    const [year, month, day] = s.dob.split('-').map(Number)
    await ref.set({
      school_id: SCHOOL_ID,
      class_id: classKeyToId[s.classKey],
      full_name: s.name,
      student_number: s.num,
      date_of_birth: dateStr(year, month, day),
      gender: s.gender,
      status: 'active',
      created_at: now(),
      updated_at: now(),
    })
    STUDENT_IDS.push(ref.id)
    console.log(`    → student ${s.name} (${ref.id})`)
  }
}

// ── 7. Parent–Student links ───────────────────────────────────────────────────

async function seedParentStudents() {
  console.log('\n── Parent-Student links')
  const links = [
    { parentEmail: 'parent1@gmail.com', studentIdx: 0, relationship: 'father' },
    { parentEmail: 'parent1@gmail.com', studentIdx: 1, relationship: 'father', primary: false },
    { parentEmail: 'parent2@gmail.com', studentIdx: 5, relationship: 'mother' },
    { parentEmail: 'parent2@gmail.com', studentIdx: 6, relationship: 'mother', primary: false },
    { parentEmail: 'parent3@gmail.com', studentIdx: 9, relationship: 'father' },
    { parentEmail: 'parent3@gmail.com', studentIdx: 10, relationship: 'father', primary: false },
  ]
  for (const l of links) {
    const ref = db.collection('parent_student').doc()
    await ref.set({
      parent_id: uids[l.parentEmail],
      student_id: STUDENT_IDS[l.studentIdx],
      relationship: l.relationship,
      is_primary: l.primary !== false,
      created_at: now(),
    })
    console.log(`    → link ${l.parentEmail} → student[${l.studentIdx}]`)
  }
}

// ── 8. Attendance (last 10 school days) ──────────────────────────────────────

async function seedAttendance() {
  console.log('\n── Attendance')
  const schoolDays: string[] = []
  const cursor = new Date('2026-03-20')
  while (schoolDays.length < 10) {
    const day = cursor.getDay()
    if (day !== 0 && day !== 6) schoolDays.push(cursor.toISOString().split('T')[0])
    cursor.setDate(cursor.getDate() + 1)
  }

  const teacherUid = uids['teacher1@stjohns.ug']
  let count = 0
  for (const date of schoolDays) {
    for (let i = 0; i < STUDENT_IDS.length; i++) {
      const s = STUDENT_DATA[i]
      const classId = classKeyToId[s.classKey]
      const status = Math.random() < 0.15 ? 'absent' : 'present'
      const ref = db.collection('attendance').doc()
      await ref.set({
        student_id: STUDENT_IDS[i],
        class_id: classId,
        school_id: SCHOOL_ID,
        date: Timestamp.fromDate(new Date(date)),
        status,
        marked_by: teacherUid,
        notes: status === 'absent' ? 'No reason given' : null,
        sms_sent: status === 'absent',
        created_at: now(),
      })
      count++
    }
  }
  console.log(`    → ${count} attendance records across ${schoolDays.length} days`)
}

// ── 9. Results ────────────────────────────────────────────────────────────────

function grade(marks: number, total: number): string {
  const pct = (marks / total) * 100
  if (pct >= 80) return 'D1'
  if (pct >= 70) return 'D2'
  if (pct >= 60) return 'C3'
  if (pct >= 55) return 'C4'
  if (pct >= 50) return 'C5'
  if (pct >= 45) return 'C6'
  if (pct >= 40) return 'P7'
  if (pct >= 35) return 'P8'
  return 'F9'
}

const SUBJECT_NAMES: Record<string, string[]> = {
  P3A: ['English', 'Mathematics', 'Science', 'Social Studies'],
  P4B: ['English', 'Mathematics', 'Science', 'Religious Education'],
  P5C: ['English', 'Mathematics', 'Science', 'History & Geography'],
}

async function seedResults() {
  console.log('\n── Results')
  const teacherUid = uids['teacher1@stjohns.ug']
  let count = 0
  for (let i = 0; i < STUDENT_IDS.length; i++) {
    const s = STUDENT_DATA[i]
    const classId = classKeyToId[s.classKey]
    const subjectIds = SUBJECT_IDS[s.classKey]
    const subjectNames = SUBJECT_NAMES[s.classKey]
    for (let j = 0; j < subjectIds.length; j++) {
      const marksObtained = Math.floor(Math.random() * 40) + 45
      const marksTotal = 100
      const ref = db.collection('results').doc()
      await ref.set({
        student_id: STUDENT_IDS[i],
        class_id: classId,
        school_id: SCHOOL_ID,
        subject_id: subjectIds[j],
        subject_name: subjectNames[j],
        term_id: TERM_ID,
        term_name: 'Term 2',
        term_year: 2026,
        marks_obtained: marksObtained,
        marks_total: marksTotal,
        grade: grade(marksObtained, marksTotal),
        remarks: marksObtained >= 70 ? 'Excellent performance' : marksObtained >= 50 ? 'Good effort' : 'Needs improvement',
        created_by: teacherUid,
        created_at: now(),
        updated_at: now(),
      })
      count++
    }
  }
  console.log(`    → ${count} result records`)
}

// ── 10. Fee Structures ────────────────────────────────────────────────────────

async function seedFeeStructures() {
  console.log('\n── Fee Structures')
  const adminUid = uids['admin@stjohns.ug']

  const structures = [
    { classId: CLASS_IDS.P3A, className: 'P3A', amount: 450000 },
    { classId: CLASS_IDS.P4B, className: 'P4B', amount: 500000 },
    { classId: CLASS_IDS.P5C, className: 'P5C', amount: 550000 },
  ]

  for (const s of structures) {
    const ref = db.collection('fee_structures').doc()
    await ref.set({
      school_id: SCHOOL_ID,
      class_id: s.classId,
      term_id: TERM_ID,
      amount: s.amount,
      payment_deadline: '2026-06-15',
      notes: `Standard fees for ${s.className} Term 2 2026`,
      created_by: adminUid,
      created_at: now(),
      updated_at: now(),
    })
    console.log(`    → fee structure ${s.className}: UGX ${s.amount.toLocaleString()}`)
  }
}

// ── 11. Fees ──────────────────────────────────────────────────────────────────

async function seedFees() {
  console.log('\n── Fees')
  const accountantUid = uids['accountant@stjohns.ug']
  let count = 0
  for (let i = 0; i < STUDENT_IDS.length; i++) {
    const totalAmount = 450000
    const paidTiers = [0, 225000, 450000]
    const amountPaid = paidTiers[Math.floor(Math.random() * paidTiers.length)]
    const ref = db.collection('fees').doc()
    await ref.set({
      student_id: STUDENT_IDS[i],
      school_id: SCHOOL_ID,
      term_id: TERM_ID,
      term_name: 'Term 2',
      term_year: 2026,
      total_amount: totalAmount,
      amount_paid: amountPaid,
      notes: amountPaid < totalAmount ? 'Balance outstanding' : 'Fully paid',
      created_by: accountantUid,
      created_at: now(),
      updated_at: now(),
    })
    count++
  }
  console.log(`    → ${count} fee records`)
}

// ── 12. Payments ──────────────────────────────────────────────────────────────

async function seedPayments() {
  console.log('\n── Payments')
  const accountantUid = uids['accountant@stjohns.ug']
  let count = 0

  // Get all fee records
  const feesSnap = await db.collection('fees').where('school_id', '==', SCHOOL_ID).get()

  for (const feeDoc of feesSnap.docs) {
    const feeData = feeDoc.data()
    const amountPaid = feeData.amount_paid as number

    if (amountPaid === 0) continue  // No payments for unpaid fees

    if (amountPaid >= (feeData.total_amount as number)) {
      // Full payment — single receipt
      const ref = db.collection('payments').doc()
      await ref.set({
        fee_id: feeDoc.id,
        student_id: feeData.student_id,
        school_id: SCHOOL_ID,
        amount: amountPaid,
        receipt_number: `RCT-2026-${String(count + 1).padStart(4, '0')}`,
        payment_date: '2026-05-10',
        notes: 'Full payment',
        created_by: accountantUid,
        created_at: now(),
      })
      count++
    } else {
      // Partial payment — split into 2 receipts
      const half = Math.floor(amountPaid / 2)
      for (let j = 0; j < 2; j++) {
        const ref = db.collection('payments').doc()
        await ref.set({
          fee_id: feeDoc.id,
          student_id: feeData.student_id,
          school_id: SCHOOL_ID,
          amount: j === 0 ? half : amountPaid - half,
          receipt_number: `RCT-2026-${String(count + 1).padStart(4, '0')}`,
          payment_date: j === 0 ? '2026-05-10' : '2026-05-25',
          notes: j === 0 ? 'First installment' : 'Second installment',
          created_by: accountantUid,
          created_at: now(),
        })
        count++
      }
    }
  }
  console.log(`    → ${count} payment records`)
}

// ── 13. Announcements ─────────────────────────────────────────────────────────

async function seedAnnouncements() {
  console.log('\n── Announcements')
  const adminUid = uids['admin@stjohns.ug']
  const announcements = [
    {
      title: 'Term 2 Opening Day',
      body: 'Dear parents, Term 2 begins on Monday 5th May 2026. All students should report by 8:00 AM in full school uniform.',
      target: 'school',
      class_id: null,
      sms_sent: true,
    },
    {
      title: 'Sports Day — 14th June',
      body: 'The annual sports day will be held on 14th June 2026. Parents are welcome to attend. Students should wear sports attire.',
      target: 'school',
      class_id: null,
      sms_sent: false,
    },
    {
      title: 'P3A Parent Meeting',
      body: 'P3A parents are reminded of the class meeting on Friday 20th March at 4:00 PM in the school library.',
      target: 'class',
      class_id: CLASS_IDS.P3A,
      sms_sent: true,
    },
    {
      title: 'Mid-Term Exams Schedule',
      body: 'Mid-term exams will run from 16th–20th June. Please ensure your child has all stationery. Revision materials are available on request.',
      target: 'school',
      class_id: null,
      sms_sent: false,
    },
  ]
  for (const a of announcements) {
    const ref = db.collection('announcements').doc()
    await ref.set({ ...a, school_id: SCHOOL_ID, created_by: adminUid, created_at: now() })
    console.log(`    → announcement "${a.title}"`)
  }
}

// ── 12. SMS Logs ──────────────────────────────────────────────────────────────

async function seedSmsLogs() {
  console.log('\n── SMS Logs')
  const logs = [
    { to: '+256701000001', message: "Dear parent, Brian Ssekandi was absent from school on 21/03/2026. Please contact the school on +256414123456.", status: 'sent', ref: 'ATB-001' },
    { to: '+256701000002', message: "Dear parent, Lydia Atim was absent from school on 22/03/2026. Please contact the school on +256414123456.", status: 'sent', ref: 'ATB-002' },
    { to: '+256701000003', message: "Dear parent, Term 2 begins on Monday 5th May 2026. All students should report by 8:00 AM in full school uniform.", status: 'sent', ref: 'ATB-003' },
    { to: '+256701000001', message: "Dear parent, P3A parents are reminded of the class meeting on Friday 20th March at 4:00 PM.", status: 'sent', ref: 'ATB-004' },
    { to: '+256701000002', message: "Delivery failed — invalid number format.", status: 'failed', ref: null, error: 'InvalidDestination' },
  ]
  for (const l of logs) {
    const ref = db.collection('sms_logs').doc()
    await ref.set({
      school_id: SCHOOL_ID,
      to_phone: l.to,
      message: l.message,
      status: l.status,
      provider_ref: l.ref ?? null,
      error: (l as { error?: string }).error ?? null,
      created_at: now(),
    })
  }
  console.log(`    → ${logs.length} SMS log records`)
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Seeding SchoolConnect Firebase...')
  console.log(`   Project: ${process.env.FIREBASE_PROJECT_ID}`)

  await seedSchool()
  await seedUsers()
  await seedTerms()
  await seedClasses()
  await seedSubjects()
  await seedStudents()
  await seedParentStudents()
  await seedAttendance()
  await seedResults()
  await seedFeeStructures()
  await seedFees()
  await seedPayments()
  await seedAnnouncements()
  await seedSmsLogs()

  console.log('\n✅ Seed complete!\n')
  console.log('Login credentials:')
  console.log('  Super Admin  : superadmin@schoolconnect.ug / SuperAdmin123!')
  console.log('  School Admin : admin@stjohns.ug           / Admin1234!')
  console.log('  Teacher 1    : teacher1@stjohns.ug        / Teacher123!')
  console.log('  Teacher 2    : teacher2@stjohns.ug        / Teacher123!')
  console.log('  Accountant   : accountant@stjohns.ug      / Accounts123!')
  console.log('  Parent 1     : parent1@gmail.com          / Parent123!')
  console.log('  Parent 2     : parent2@gmail.com          / Parent123!')
  console.log('  Parent 3     : parent3@gmail.com          / Parent123!')

  process.exit(0)
}

main().catch(err => { console.error(err); process.exit(1) })
