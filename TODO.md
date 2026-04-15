# SchoolConnect — Implementation TODO

> This file is written for any developer or AI agent picking up work.
> Every item contains enough context to implement from scratch.
> Priority order: **P1 = Critical / P2 = High / P3 = Nice-to-have**

---

## 1. Terms Management — Full CRUD UI + 3-Term Academic Year Support

**Current state:**  
Terms exist as a Firestore collection (`terms`) with fields: `id, school_id, name, year, start_date, end_date, is_current`. Classes, fees, results, and fee structures all reference `term_id`. However, there is **no UI for creating or managing terms** — they presumably have to be created directly in Firestore. There is also no concept of "Term 1 / Term 2 / Term 3" naming, academic year grouping, or automated term transitions.

**Why this matters:**  
Uganda schools run either 2 or 3 terms per academic year. Without a proper term management UI, school admins cannot set up new terms without developer access. Classes, fees, and results all break if no current term exists.

---

### 1a. Add Term Server Actions

**File:** `web/src/lib/actions/terms.ts` (create new file)

```ts
'use server'
// Actions to implement:

// createTerm(schoolId, data: { name: string, year: number, startDate: string, endDate: string })
// - Validates name is one of "Term 1" | "Term 2" | "Term 3" (or custom)
// - Validates start_date < end_date
// - Checks no other term with same name + year already exists for the school
// - Creates Firestore doc in `terms` collection
// - Does NOT auto-set is_current (admin does this separately)
// - Returns { success, id }

// setCurrentTerm(schoolId, termId)
// - Runs a Firestore batch: set all other terms for this school to is_current=false, then set this one to true
// - This is atomic — no partial state possible
// - Returns { success }

// updateTerm(termId, data)
// - Updates name, start_date, end_date only (not year, not is_current)
// - Returns { success }

// deleteTerm(termId, schoolId)
// - Check: no classes reference this term_id (query `classes` where school_id=schoolId AND term_id=termId)
// - Check: no fee_structures reference this term_id
// - If any references exist, return { error: 'Term is in use and cannot be deleted' }
// - Otherwise delete the doc
// - Returns { success } or { error }

// getTermsBySchool(schoolId)
// - Fetch all terms ordered by year desc, name asc
// - Returns serialized array
```

---

### 1b. Add Terms Management Page (School Admin)

**Route:** `/school-admin/terms`  
**Files to create:**  
- `web/src/app/(dashboard)/school-admin/terms/page.tsx` (server wrapper)  
- `web/src/app/(dashboard)/school-admin/terms/terms-page.tsx` (client component)

**page.tsx** (server):
```ts
// Fetch all terms for profile.school_id ordered by year desc
// Pass to <TermsPage terms={...} schoolId={...} />
```

**terms-page.tsx** (client — `'use client'`):

Layout:
1. **Header** — "Academic Terms" title + "Add Term" button
2. **Terms grouped by year** — For each year (e.g., 2026, 2025) show a card group with Term 1, Term 2, Term 3
3. **Each term row** shows:
   - Name (Term 1 / Term 2 / Term 3)
   - Date range (e.g., "Feb 3 – May 30")
   - "CURRENT" amber badge if `is_current === true`
   - "Set as Current" button (if not current) → calls `setCurrentTerm()`
   - Edit button → inline edit form or modal
   - Delete button → calls `deleteTerm()`, shows error if in use
4. **Add Term form** (inline below header or in a slide-over):
   - Fields: Name (dropdown: "Term 1", "Term 2", "Term 3"), Year (number input, default current year), Start Date, End Date
   - Submit → `createTerm()`, then `router.refresh()`

**State pattern** (follow existing pages like `sales-reps-page.tsx`):
```ts
const [isPending, startTransition] = useTransition()
// wrap all action calls in startTransition
```

---

### 1c. Add "Terms" nav link in School Admin sidebar

**File:** `web/src/components/layout/school-admin-sidebar.tsx` (or wherever nav items are defined — search for "fee-structures" to find the right file)

Add a nav item:
```ts
{ href: '/school-admin/terms', label: 'Terms', icon: CalendarIcon }
```
Place it between Classes and Fee Structures logically.

---

### 1d. Auto-select current term in Class creation

**File:** `web/src/app/(dashboard)/school-admin/classes/create/create-class-page.tsx`

Currently the term selector shows all terms. If `is_current === true` term exists, it should be pre-selected as default value in the `<select>` element. The server wrapper (`page.tsx`) already passes `terms` — just find the one with `is_current: true` and use its id as the default value in the form state.

---

## 2. Improved Analytics for All Roles

**Current state:**  
Dashboards show plain stat cards (4 metrics each). The super admin analytics page has progress bars for subscription distribution and top schools, but nothing interactive or time-based. No charts exist anywhere — no recharts, chart.js, or any other library is installed.

**Why this matters:**  
Analytics pages exist for a reason — admins need to see trends, patterns, and comparisons at a glance, not just static numbers.

---

### 2a. Install Recharts

```bash
cd web && npm install recharts
```

Recharts works natively with React/Next.js. All chart components are client-side — wrap them in `'use client'` or use dynamic imports with `{ ssr: false }`.

---

### 2b. Super Admin Analytics — Add Time-Series Revenue Chart

**File:** `web/src/app/(dashboard)/super-admin/analytics/analytics-page.tsx`

Currently this page renders progress bars. Add a recharts `LineChart` or `AreaChart` showing **monthly contract payments collected** over the last 12 months.

**Data source:** `getAllContractPayments()` (already in `billing.ts`) returns `{ payment_date, amount }` for every payment. Group by `payment_date.substring(0, 7)` (YYYY-MM) to get monthly totals.

**Implementation in the server page wrapper:**
```ts
// Group payments by month in the page.tsx server component:
const payments = await getAllContractPayments()
const monthlyRevenue = groupBy(payments, p => p.payment_date?.substring(0, 7))
// Build array: [{ month: '2025-01', collected: 450000 }, ...]
// Pass to analytics client component
```

**Chart in client component:**
```tsx
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

<ResponsiveContainer width="100%" height={280}>
  <AreaChart data={monthlyRevenue}>
    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
    <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 12 }} />
    <YAxis tickFormatter={v => `${(v/1000).toFixed(0)}K`} tick={{ fill: '#94a3b8', fontSize: 12 }} />
    <Tooltip formatter={v => `UGX ${v.toLocaleString()}`} contentStyle={{ background: '#1e293b', border: '1px solid #334155' }} />
    <Area type="monotone" dataKey="collected" stroke="#f59e0b" fill="#f59e0b20" />
  </AreaChart>
</ResponsiveContainer>
```

---

### 2c. Super Admin Analytics — Schools by Subscription Status (Pie/Donut Chart)

Replace the current progress-bar-style subscription breakdown with a recharts `PieChart` or `RadialBarChart`.

**Data:** Already available in analytics page — count of `active`, `trial`, `inactive` schools.

```tsx
import { PieChart, Pie, Cell, Legend, Tooltip } from 'recharts'
const data = [
  { name: 'Active', value: activeCount, color: '#22c55e' },
  { name: 'Trial', value: trialCount, color: '#f59e0b' },
  { name: 'Inactive', value: inactiveCount, color: '#ef4444' },
]
// Render PieChart with Cell fill={entry.color}
```

---

### 2d. School Admin Analytics — Enrollment Trend + Attendance Overview

**File:** `web/src/app/(dashboard)/school-admin/page.tsx` and a new `analytics/` sub-route

Create `/school-admin/analytics/page.tsx`:

**Data to fetch:**
- Students per class (already available from classes + students query)
- Attendance rate per class for the current term (query `attendance` collection where school_id=... and date >= term.start_date)

**Charts to add:**

1. **BarChart: Students per Class**
   - X-axis: class name, Y-axis: student count
   - Shows which classes are over/under capacity at a glance

2. **RadialBarChart or grouped BarChart: Attendance by Class**
   - Show present% vs absent% per class
   - Color present bars green, absent bars red

**Data aggregation** (do in server page.tsx, pass pre-computed to client):
```ts
const classesSummary = classes.map(c => ({
  name: c.name,
  students: students.filter(s => s.class_id === c.id).length,
  presentRate: calculateAttendanceRate(attendance, c.id),
}))
```

---

### 2e. Accountant Analytics — Fee Collection Trend

**File:** `web/src/app/(dashboard)/accountant/page.tsx`

Add a `BarChart` showing monthly fee collection for the current academic year.

**Data source:** Query `payments` where `school_id = profile.school_id` — group by `payment_date.substring(0, 7)` for monthly totals.

**Chart:**
```tsx
<BarChart data={monthlyCollections}>
  <Bar dataKey="collected" fill="#f59e0b" radius={[4, 4, 0, 0]} />
  <XAxis dataKey="month" />
  <YAxis tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
  <Tooltip formatter={v => `UGX ${v.toLocaleString()}`} />
</BarChart>
```

---

## 3. Add Charts to Reports Pages

**Current state:**  
All 3 reports pages (super-admin, school-admin, accountant) are tab-based tables with stat cards and CSV export. No charts exist.

**Prerequisite:** Install recharts first (see item 2a).

---

### 3a. Super Admin Reports — Revenue Breakdown BarChart

**File:** `web/src/app/(dashboard)/super-admin/reports/reports-page.tsx`

In the **Revenue tab**, add a `BarChart` above the table showing the top 10 schools by invoiced amount vs collected amount side-by-side.

**Data:** Already available — `billing.billingBySchool[]` contains `{ schoolName, agreedAmount, totalPaid }`.

```tsx
// Sort billingBySchool by agreedAmount desc, take top 10
const top10 = [...billing.billingBySchool]
  .sort((a, b) => b.agreedAmount - a.agreedAmount)
  .slice(0, 10)
  .map(b => ({ name: b.schoolName.split(' ')[0], invoiced: b.agreedAmount, collected: b.totalPaid }))

<ResponsiveContainer width="100%" height={300}>
  <BarChart data={top10} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
    <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
    <YAxis tickFormatter={v => `${(v/1000).toFixed(0)}K`} tick={{ fill: '#94a3b8', fontSize: 11 }} />
    <Tooltip formatter={v => `UGX ${Number(v).toLocaleString()}`} contentStyle={{ background: '#1e293b', border: '1px solid #334155' }} />
    <Legend />
    <Bar dataKey="invoiced" fill="#3b82f6" name="Invoiced" radius={[4, 4, 0, 0]} />
    <Bar dataKey="collected" fill="#22c55e" name="Collected" radius={[4, 4, 0, 0]} />
  </BarChart>
</ResponsiveContainer>
```

Add this visually above the table in the Revenue tab. Wrap in a `<div className="bg-slate-800 rounded-lg p-4 mb-6">` card.

---

### 3b. School Admin Reports — Enrollment PieChart + Attendance BarChart

**File:** `web/src/app/(dashboard)/school-admin/reports/reports-page.tsx`

**Enrollment tab** — Add a `PieChart` showing student distribution across classes:
```tsx
// Data: classes.map(c => ({ name: c.name, value: studentCountForClass(c.id) }))
// PieChart with Cell, each class gets a different color from a palette
const COLORS = ['#f59e0b', '#3b82f6', '#22c55e', '#a855f7', '#ef4444', '#06b6d4', '#f97316']
```

**Attendance tab** — Add a `BarChart` showing present vs absent percentage per class:
```tsx
// Data: perClassAttendance.map(c => ({ name: c.name, present: c.presentRate, absent: 100 - c.presentRate }))
// Stacked BarChart: present (green), absent (red)
```

Place charts above the respective tables in each tab.

---

### 3c. Accountant Reports — Fee Collection BarChart + Outstanding PieChart

**File:** `web/src/app/(dashboard)/accountant/reports/reports-page.tsx`

**Overview tab** — Add a `BarChart` showing "Billed vs Collected vs Outstanding" per class:
```tsx
// Data: per-class fee summary already calculated in the page
// Grouped bars: billed (blue), collected (green), outstanding (amber)
```

**Overdue tab** — Add a `PieChart` showing proportion of:
- Fully paid students
- Partially paid students
- Unpaid students

Use threshold: fully paid = balance <= 0, partially paid = 0 < balance < totalBilled, unpaid = no payments recorded.

---

## 4. Sales Reps — Complete Workflow Implementation

**Current state:**  
Sales reps can be created/updated/deleted via a UI page at `/super-admin/sales-reps`. They can be linked to schools via school contracts. The "Sales Team" tab in super-admin reports shows performance per rep. **However, there is no dedicated per-rep detail page, no way to assign a sales rep to a school directly from the Schools list, and no notifications/targets system.**

---

### 4a. Sales Rep Detail Page

**Route:** `/super-admin/sales-reps/[repId]`  
**Files to create:**  
- `web/src/app/(dashboard)/super-admin/sales-reps/[repId]/page.tsx` (server wrapper)
- `web/src/app/(dashboard)/super-admin/sales-reps/[repId]/rep-detail-page.tsx` (client component)

**Server page.tsx** — fetch:
```ts
// 1. Get sales rep: adminDb().collection('sales_reps').doc(repId).get()
// 2. Get all contracts where sales_rep_id === repId
// 3. For each contract, get school name from schools collection
// 4. Get all payments for those contracts
// Serialize all Timestamps before passing to client
```

**Client rep-detail-page.tsx** — display:
1. Rep header: name, email, phone, active badge, "Edit" button (inline)
2. KPI cards: Schools Assigned, Total Invoiced, Total Collected, Collection Rate %
3. Table: Schools this rep manages — School Name, Contract Status, Invoiced, Collected, Pending
4. Payment log: recent payments across all this rep's schools

---

### 4b. Assign Sales Rep Directly from Schools List

**File:** `web/src/app/(dashboard)/super-admin/schools/schools-page.tsx` (find this file — look for school list UI)

In each school row, add an "Assign Rep" or "Edit Contract" button that opens a small dialog/dropdown:
- Dropdown of all active sales reps (fetched via `getSalesReps()`)
- Current assigned rep shown as selected
- On change: call `upsertSchoolContract(schoolId, { salesRepId: selectedRepId, agreedAmount: contract.agreedAmount })`

**Data requirement:** The server `page.tsx` needs to also fetch `getAllSchoolContracts()` and `getSalesReps()` so the client has both to render the dropdown with current selection.

---

### 4c. Sales Rep Commission / Target Tracking (P3)

**New Firestore collection:** `sales_rep_targets`
```
{
  id: auto
  rep_id: string
  year: number
  month: number  // 1–12, or null for annual target
  target_amount: number
  created_at: Timestamp
}
```

**New action:** `setSalesRepTarget(repId, { year, month, targetAmount })`

**Display:** In the Sales Rep detail page (4a above), add a "Target Progress" section:
- Monthly target bar: `(collected / target) * 100` as a filled progress bar
- Color: green if ≥100%, amber if 70–99%, red if <70%

---

### 4d. Sales Rep Performance Summary in Sales Reps List

**File:** `web/src/app/(dashboard)/super-admin/sales-reps/sales-reps-page.tsx`

Currently the table only shows: Name, Email, Phone, Status, Actions.

Extend it to show performance columns inline by passing billing data from `getBillingOverview()` into the page:

**Server page.tsx** — add `getBillingOverview()` call alongside `getSalesReps()`:
```ts
const [salesReps, billing] = await Promise.all([getSalesReps(), getBillingOverview()])
```

**Client component** — for each sales rep row, look up their performance from `billing.salesRepPerformance[rep.id]`:
- Schools: N
- Collected: UGX X
- Rate: X%

This makes the sales reps list immediately useful without needing to click into each rep.

---

## 5. Global Navigation Loading Indicator

**Current state:**  
There is a `loading.tsx` at `/app/(dashboard)/loading.tsx` which shows a spinner in the content area for full-page route transitions. Individual forms use `useTransition` to show "Creating..." on buttons. However, there is **no top-of-page progress bar** (like NProgress) and **no feedback when clicking nav links** — the user clicks a nav item and sees nothing happen for 1–2 seconds while the server component loads.

---

### 5a. Install and Wire `next-nprogress-bar`

This is the simplest correct solution for Next.js App Router. It shows a thin amber progress bar at the top of the page whenever a route transition is in progress.

```bash
cd web && npm install next-nprogress-bar
```

**Create a Providers component** (if one doesn't exist):

**File:** `web/src/components/providers.tsx`
```tsx
'use client'
import { AppProgressBar as ProgressBar } from 'next-nprogress-bar'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <ProgressBar
        height="3px"
        color="#f59e0b"
        options={{ showSpinner: false }}
        shallowRouting
      />
    </>
  )
}
```

**Wire into root layout:**

**File:** `web/src/app/layout.tsx` — wrap `{children}` with `<Providers>`:
```tsx
import { Providers } from '@/components/providers'

// In the JSX:
<Providers>{children}</Providers>
```

This automatically shows the amber progress bar on **every** `router.push()`, `Link` click, and `redirect()`.

---

### 5b. Wrap All Dashboard Nav Links with Pending State

**File:** Find the sidebar nav component(s). Search for files containing `href: '/school-admin'` or similar nav arrays. Likely in `web/src/components/layout/`.

Currently nav items use `<Link href="...">`. Replace with an enhanced `NavLink` component that shows a spinner on the active link while loading:

**Create:** `web/src/components/nav-link.tsx`
```tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

interface NavLinkProps {
  href: string
  children: React.ReactNode
  className?: string
  activeClassName?: string
}

export function NavLink({ href, children, className, activeClassName }: NavLinkProps) {
  const pathname = usePathname()
  const isActive = pathname === href || pathname.startsWith(href + '/')
  const [isPending, setIsPending] = useState(false)

  return (
    <Link
      href={href}
      className={`${className} ${isActive ? activeClassName : ''} relative`}
      onClick={() => setIsPending(true)}
      onTransitionEnd={() => setIsPending(false)}
    >
      {children}
      {isPending && (
        <span className="absolute right-2 top-1/2 -translate-y-1/2">
          <span className="h-3 w-3 rounded-full border-2 border-amber-500 border-r-transparent animate-spin inline-block" />
        </span>
      )}
    </Link>
  )
}
```

Replace all `<Link>` elements in sidebar nav files with `<NavLink>`. The spinner appears in the nav item immediately on click and disappears when the new page loads.

---

### 5c. Add Loading Skeleton to Table-Heavy Pages (P2)

Pages that load large tables (reports, billing, students list) currently show a blank screen while the server component renders. Add skeleton loaders.

**Pattern:** Create per-page `loading.tsx` files in the route folders that need them.

**Example:** `web/src/app/(dashboard)/super-admin/reports/loading.tsx`
```tsx
export default function ReportsLoading() {
  return (
    <div className="p-6 space-y-4">
      <div className="h-8 w-48 bg-slate-700 rounded animate-pulse" />
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 bg-slate-800 rounded-lg animate-pulse" />
        ))}
      </div>
      <div className="h-64 bg-slate-800 rounded-lg animate-pulse" />
    </div>
  )
}
```

Create similar `loading.tsx` files for these heavy routes:
- `/super-admin/reports/loading.tsx`
- `/super-admin/billing/loading.tsx`
- `/super-admin/analytics/loading.tsx`
- `/school-admin/reports/loading.tsx`
- `/accountant/reports/loading.tsx`

The shape of the skeleton should roughly match the page layout (cards, then a table).

---

### 5d. Button-Level Spinner Consistency Audit (P2)

Do a sweep of all client component forms and confirm every submit/action button follows this pattern:

```tsx
<button
  type="submit"
  disabled={isPending}
  className="... disabled:opacity-50 disabled:cursor-not-allowed"
>
  {isPending ? (
    <>
      <span className="h-4 w-4 rounded-full border-2 border-white border-r-transparent animate-spin inline-block mr-2" />
      Working...
    </>
  ) : (
    'Submit'
  )}
</button>
```

Pages to audit (check each has full `disabled` + spinner pattern):
- `school-admin/classes/create/create-class-page.tsx`
- `school-admin/teachers/add/add-teacher-page.tsx`
- `school-admin/fee-structures/fee-structures-page.tsx`
- `super-admin/sales-reps/sales-reps-page.tsx`
- `super-admin/billing/billing-page.tsx` (if it exists)
- `teacher/attendance/[classId]/attendance-form.tsx`
- `teacher/results/[classId]/results-form.tsx`

---

## Implementation Order

| # | Item | Priority | Effort | Depends On |
|---|------|----------|--------|------------|
| 1 | Install recharts (`npm install recharts`) | P1 | 5 min | — |
| 2 | Terms actions (`lib/actions/terms.ts`) | P1 | 1h | — |
| 3 | Terms management page (school-admin) | P1 | 2h | #2 |
| 4 | Install `next-nprogress-bar` + wire into layout | P1 | 20 min | — |
| 5 | Page-level loading skeletons | P2 | 1h | — |
| 6 | NavLink component with pending spinner | P2 | 30 min | — |
| 7 | Super Admin Reports — Revenue BarChart | P2 | 1h | #1 |
| 8 | Accountant Reports — Collection BarChart | P2 | 1h | #1 |
| 9 | School Admin Reports — Enrollment Pie + Attendance Bar | P2 | 1h | #1 |
| 10 | Super Admin Analytics — Monthly Revenue AreaChart | P2 | 1.5h | #1 |
| 11 | Sales Rep detail page | P2 | 2h | — |
| 12 | Assign rep from Schools list | P2 | 1h | — |
| 13 | Button-level spinner audit | P2 | 1h | — |
| 14 | Sales rep target tracking | P3 | 3h | #11 |
| 15 | School Admin Analytics page | P3 | 2h | #1 |
| 16 | Accountant Analytics trend chart | P3 | 1h | #1 |
