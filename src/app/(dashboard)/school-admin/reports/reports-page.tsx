'use client'

import { useState, useRef, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Users,
  DollarSign,
  ClipboardList,
  Megaphone,
  Download,
  GraduationCap,
  CheckCircle,
  XCircle,
  FileText,
} from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
} from 'recharts'

export default function SchoolAdminReportsPage({
  schoolName,
  students,
  classes,
  fees,
  attendance,
  announcements,
}: {
  schoolName: string
  students: Record<string, any>[]
  classes: Record<string, any>[]
  fees: Record<string, any>[]
  attendance: Record<string, any>[]
  announcements: Record<string, any>[]
}) {
  const [activeTab, setActiveTab] = useState<'enrollment' | 'fees' | 'attendance' | 'announcements'>('enrollment')
  const [pdfPending, startPdfTransition] = useTransition()
  const chartRef = useRef<HTMLDivElement>(null)

  const COLORS = ['#f59e0b', '#3b82f6', '#22c55e', '#a855f7', '#ef4444', '#06b6d4', '#f97316', '#ec4899', '#84cc16', '#6366f1']

  const downloadCSV = (filename: string, headers: string[], rows: string[][]) => {
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }

  const svgToDataUrl = async (svgEl: SVGElement): Promise<string | null> => {
    try {
      const serialized = new XMLSerializer().serializeToString(svgEl)
      const svgBlob = new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(svgBlob)
      const img = new Image()
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = () => reject()
        img.src = url
      })
      const canvas = document.createElement('canvas')
      canvas.width = svgEl.clientWidth || 600
      canvas.height = svgEl.clientHeight || 280
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = '#1e293b'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      return canvas.toDataURL('image/png')
    } catch {
      return null
    }
  }

  const downloadPDF = (filename: string, title: string) => {
    startPdfTransition(async () => {
      const { jsPDF } = await import('jspdf')
      const autoTable = (await import('jspdf-autotable')).default

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pageW = doc.internal.pageSize.getWidth()
      let y = 14

      // Header
      doc.setFontSize(16)
      doc.setTextColor(245, 158, 11)
      doc.text(schoolName, 14, y)
      y += 7
      doc.setFontSize(12)
      doc.setTextColor(148, 163, 184)
      doc.text(title, 14, y)
      y += 5
      doc.setDrawColor(51, 65, 85)
      doc.line(14, y, pageW - 14, y)
      y += 6

      const addStats = (stats: { label: string; value: string }[]) => {
        doc.setFontSize(9)
        doc.setTextColor(148, 163, 184)
        const colW = (pageW - 28) / stats.length
        stats.forEach((s, i) => {
          const x = 14 + i * colW
          doc.text(s.label, x, y)
          doc.setFontSize(13)
          doc.setTextColor(255, 255, 255)
          doc.text(s.value, x, y + 5)
          doc.setFontSize(9)
          doc.setTextColor(148, 163, 184)
        })
        y += 14
      }

      const addChart = async () => {
        const svgEl = chartRef.current?.querySelector('svg')
        if (!svgEl) return
        const imgData = await svgToDataUrl(svgEl as SVGElement)
        if (!imgData) return
        const chartH = 55
        if (y + chartH > doc.internal.pageSize.getHeight() - 14) { doc.addPage(); y = 14 }
        doc.addImage(imgData, 'PNG', 14, y, pageW - 28, chartH)
        y += chartH + 4
      }

      if (activeTab === 'enrollment') {
        addStats([
          { label: 'Total Students', value: String(students.length) },
          { label: 'Active', value: String(activeStudents) },
          { label: 'Classes', value: String(classes.length) },
          { label: 'Avg per Class', value: classes.length > 0 ? String(Math.round(activeStudents / classes.length)) : '0' },
        ])
        await addChart()
        autoTable(doc, {
          startY: y,
          head: [['Class', 'Students', '% of Total']],
          body: enrollmentByClass.map(c => [
            c.className,
            String(c.studentCount),
            `${activeStudents > 0 ? ((c.studentCount / activeStudents) * 100).toFixed(1) : 0}%`,
          ]),
          styles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 9 },
          headStyles: { fillColor: [30, 41, 59], textColor: [245, 158, 11] },
          alternateRowStyles: { fillColor: [30, 41, 59] },
        })
      } else if (activeTab === 'fees') {
        addStats([
          { label: 'Total Billed', value: `UGX ${totalBilled.toLocaleString()}` },
          { label: 'Collected', value: `UGX ${totalPaid.toLocaleString()}` },
          { label: 'Outstanding', value: `UGX ${(totalBilled - totalPaid).toLocaleString()}` },
        ])
        autoTable(doc, {
          startY: y,
          head: [['Class', 'Billed', 'Collected', 'Balance', 'Collection %']],
          body: feesByClass.map(c => [
            c.className,
            `UGX ${c.billed.toLocaleString()}`,
            `UGX ${c.paid.toLocaleString()}`,
            `UGX ${c.balance.toLocaleString()}`,
            `${c.collectionRate}%`,
          ]),
          styles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 9 },
          headStyles: { fillColor: [30, 41, 59], textColor: [245, 158, 11] },
          alternateRowStyles: { fillColor: [30, 41, 59] },
        })
      } else if (activeTab === 'attendance') {
        addStats([
          { label: 'Total Records', value: String(attendance.length) },
          { label: 'Present', value: String(presentCount) },
          { label: 'Absent', value: String(absentCount) },
        ])
        await addChart()
        autoTable(doc, {
          startY: y,
          head: [['Class', 'Present', 'Absent', 'Attendance %']],
          body: attendanceByClass.map(c => [c.className, String(c.present), String(c.absent), `${c.rate}%`]),
          styles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 9 },
          headStyles: { fillColor: [30, 41, 59], textColor: [245, 158, 11] },
          alternateRowStyles: { fillColor: [30, 41, 59] },
        })
      } else if (activeTab === 'announcements') {
        autoTable(doc, {
          startY: y,
          head: [['Title', 'Target', 'SMS Sent', 'Date']],
          body: announcements.map(a => [
            a.title,
            a.target,
            a.sms_sent ? 'Yes' : 'No',
            a.created_at?._seconds ? new Date(a.created_at._seconds * 1000).toLocaleDateString() : '—',
          ]),
          styles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 9 },
          headStyles: { fillColor: [30, 41, 59], textColor: [245, 158, 11] },
          alternateRowStyles: { fillColor: [30, 41, 59] },
        })
      }

      doc.save(filename)
    })
  }

  const totalBilled = fees.reduce((sum, f) => sum + (f.total_amount as number), 0)
  const totalPaid = fees.reduce((sum, f) => sum + (f.amount_paid as number), 0)
  const activeStudents = students.filter(s => s.status === 'active').length
  const presentCount = attendance.filter(a => a.status === 'present').length
  const absentCount = attendance.filter(a => a.status === 'absent').length

  const enrollmentByClass = classes.map(cls => ({
    className: cls.name as string,
    studentCount: students.filter(s => s.class_id === cls.id && s.status === 'active').length,
  }))

  const feesByClass = classes.map(cls => {
    const classStudents = students.filter(s => s.class_id === cls.id)
    const classStudentIds = new Set(classStudents.map(s => s.id))
    const classFees = fees.filter(f => classStudentIds.has(f.student_id))
    const billed = classFees.reduce((sum, f) => sum + (f.total_amount as number), 0)
    const paid = classFees.reduce((sum, f) => sum + (f.amount_paid as number), 0)
    return {
      className: cls.name as string,
      billed,
      paid,
      balance: billed - paid,
      collectionRate: billed > 0 ? ((paid / billed) * 100).toFixed(1) : '0',
    }
  })

  const attendanceByClass = classes.map(cls => {
    const classStudents = students.filter(s => s.class_id === cls.id)
    const classStudentIds = new Set(classStudents.map(s => s.id))
    const classAttendance = attendance.filter(a => classStudentIds.has(a.student_id))
    const present = classAttendance.filter(a => a.status === 'present').length
    const absent = classAttendance.filter(a => a.status === 'absent').length
    const total = present + absent
    return {
      className: cls.name as string,
      present,
      absent,
      rate: total > 0 ? ((present / total) * 100).toFixed(1) : '0',
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">School Reports</h1>
          <p className="text-slate-400 text-sm mt-1">Comprehensive reports for {schoolName}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-800">
        {[
          { id: 'enrollment' as const, label: 'Enrollment', icon: Users },
          { id: 'fees' as const, label: 'Fees', icon: DollarSign },
          { id: 'attendance' as const, label: 'Attendance', icon: ClipboardList },
          { id: 'announcements' as const, label: 'Announcements', icon: Megaphone },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Charts are captured per-tab via chartRef */}
      <div>

      {/* ── Enrollment Tab ───────────────────────────────────────────── */}
      {activeTab === 'enrollment' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-400">Total Students</CardTitle>
                <Users className="w-4 h-4 text-amber-400" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-white">{students.length}</p>
                <p className="text-slate-500 text-xs">{activeStudents} active</p>
              </CardContent>
            </Card>
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-400">Classes</CardTitle>
                <GraduationCap className="w-4 h-4 text-blue-400" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-white">{classes.length}</p>
              </CardContent>
            </Card>
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-400">Avg per Class</CardTitle>
                <Users className="w-4 h-4 text-green-400" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-white">
                  {classes.length > 0 ? Math.round(activeStudents / classes.length) : 0}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-slate-900 border-slate-800 mt-4">
            <CardHeader>
              <CardTitle className="text-white">Student Distribution by Class</CardTitle>
            </CardHeader>
            <CardContent>
              {enrollmentByClass.filter(c => c.studentCount > 0).length === 0 ? (
                <p className="text-slate-400 text-center py-8">No enrollment data yet.</p>
              ) : (
                <div ref={chartRef}>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={enrollmentByClass.filter(c => c.studentCount > 0)}
                      nameKey="className"
                      dataKey="studentCount"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      label={(entry) => `${(entry as any).className}: ${(entry as any).studentCount}`}
                    >
                      {enrollmentByClass.filter(c => c.studentCount > 0).map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                  </PieChart>
                </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800 mt-4">
            <CardHeader>
              <CardTitle className="text-white">Enrollment by Class</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-3 px-4 text-sm text-slate-400 font-medium">Class</th>
                      <th className="text-right py-3 px-4 text-sm text-slate-400 font-medium">Students</th>
                      <th className="text-right py-3 px-4 text-sm text-slate-400 font-medium">% of Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrollmentByClass.map(c => (
                      <tr key={c.className} className="border-b border-slate-800">
                        <td className="py-3 px-4 text-white">{c.className}</td>
                        <td className="py-3 px-4 text-right text-slate-300">{c.studentCount}</td>
                        <td className="py-3 px-4 text-right text-slate-300">
                          {activeStudents > 0 ? ((c.studentCount / activeStudents) * 100).toFixed(1) : 0}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3 mt-4">
            <Button
              onClick={() => downloadCSV(
                `${schoolName}_enrollment.csv`,
                ['Class', 'Student Count', '% of Total'],
                enrollmentByClass.map(c => [
                  c.className,
                  String(c.studentCount),
                  `${activeStudents > 0 ? ((c.studentCount / activeStudents) * 100).toFixed(1) : 0}%`,
                ])
              )}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold"
            >
              <Download className="w-4 h-4 mr-2" />
              Download CSV
            </Button>
            <Button
              onClick={() => downloadPDF(`${schoolName}_enrollment.pdf`, 'Enrollment Report')}
              disabled={pdfPending}
              variant="outline"
              className="border-slate-700 text-slate-300 hover:text-white hover:border-amber-500"
            >
              <FileText className="w-4 h-4 mr-2" />
              {pdfPending ? 'Generating...' : 'Download PDF'}
            </Button>
          </div>
        </>
      )}

      {/* ── Fees Tab ─────────────────────────────────────────────────── */}
      {activeTab === 'fees' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-400">Total Billed</CardTitle>
                <DollarSign className="w-4 h-4 text-amber-400" />
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold text-white">UGX {totalBilled.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-400">Total Collected</CardTitle>
                <CheckCircle className="w-4 h-4 text-green-400" />
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold text-white">UGX {totalPaid.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-400">Outstanding</CardTitle>
                <XCircle className="w-4 h-4 text-red-400" />
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold text-white">UGX {(totalBilled - totalPaid).toLocaleString()}</p>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-slate-900 border-slate-800 mt-4">
            <CardHeader>
              <CardTitle className="text-white">Fee Collection by Class</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-3 px-4 text-sm text-slate-400 font-medium">Class</th>
                      <th className="text-right py-3 px-4 text-sm text-slate-400 font-medium">Billed</th>
                      <th className="text-right py-3 px-4 text-sm text-slate-400 font-medium">Collected</th>
                      <th className="text-right py-3 px-4 text-sm text-slate-400 font-medium">Balance</th>
                      <th className="text-right py-3 px-4 text-sm text-slate-400 font-medium">Collection %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feesByClass.map(c => (
                      <tr key={c.className} className="border-b border-slate-800">
                        <td className="py-3 px-4 text-white">{c.className}</td>
                        <td className="py-3 px-4 text-right text-white">UGX {c.billed.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right text-green-400">UGX {c.paid.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right text-red-400">UGX {c.balance.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            parseFloat(c.collectionRate) >= 80
                              ? 'bg-green-500/20 text-green-400'
                              : parseFloat(c.collectionRate) >= 50
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-red-500/20 text-red-400'
                          }`}>
                            {c.collectionRate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3 mt-4">
            <Button
              onClick={() => downloadCSV(
                `${schoolName}_fees.csv`,
                ['Class', 'Total Billed', 'Total Collected', 'Balance', 'Collection %'],
                feesByClass.map(c => [
                  c.className,
                  `UGX ${c.billed.toLocaleString()}`,
                  `UGX ${c.paid.toLocaleString()}`,
                  `UGX ${c.balance.toLocaleString()}`,
                  `${c.collectionRate}%`,
                ])
              )}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold"
            >
              <Download className="w-4 h-4 mr-2" />
              Download CSV
            </Button>
            <Button
              onClick={() => downloadPDF(`${schoolName}_fees.pdf`, 'Fee Collection Report')}
              disabled={pdfPending}
              variant="outline"
              className="border-slate-700 text-slate-300 hover:text-white hover:border-amber-500"
            >
              <FileText className="w-4 h-4 mr-2" />
              {pdfPending ? 'Generating...' : 'Download PDF'}
            </Button>
          </div>
        </>
      )}

      {/* ── Attendance Tab ───────────────────────────────────────────── */}
      {activeTab === 'attendance' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-400">Total Records</CardTitle>
                <ClipboardList className="w-4 h-4 text-amber-400" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-white">{attendance.length}</p>
              </CardContent>
            </Card>
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-400">Present</CardTitle>
                <CheckCircle className="w-4 h-4 text-green-400" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-400">{presentCount}</p>
              </CardContent>
            </Card>
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-400">Absent</CardTitle>
                <XCircle className="w-4 h-4 text-red-400" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-red-400">{absentCount}</p>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-slate-900 border-slate-800 mt-4">
            <CardHeader>
              <CardTitle className="text-white">Attendance Rate by Class</CardTitle>
            </CardHeader>
            <CardContent>
              {attendanceByClass.length === 0 ? (
                <p className="text-slate-400 text-center py-8">No attendance data yet.</p>
              ) : (
                <div ref={chartRef}>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={attendanceByClass.map(c => ({
                      name: c.className,
                      present: parseFloat(c.rate),
                      absent: (100 - parseFloat(c.rate)).toFixed(1),
                    }))}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis tickFormatter={v => `${v}%`} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <Tooltip
                      formatter={v => `${v}%`}
                      contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                    />
                    <Legend />
                    <Bar dataKey="present" fill="#22c55e" name="Present %" stackId="a" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="absent" fill="#ef4444" name="Absent %" stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800 mt-4">
            <CardHeader>
              <CardTitle className="text-white">Attendance by Class</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-3 px-4 text-sm text-slate-400 font-medium">Class</th>
                      <th className="text-right py-3 px-4 text-sm text-slate-400 font-medium">Present</th>
                      <th className="text-right py-3 px-4 text-sm text-slate-400 font-medium">Absent</th>
                      <th className="text-right py-3 px-4 text-sm text-slate-400 font-medium">Attendance %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceByClass.map(c => (
                      <tr key={c.className} className="border-b border-slate-800">
                        <td className="py-3 px-4 text-white">{c.className}</td>
                        <td className="py-3 px-4 text-right text-green-400">{c.present}</td>
                        <td className="py-3 px-4 text-right text-red-400">{c.absent}</td>
                        <td className="py-3 px-4 text-right">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            parseFloat(c.rate) >= 80
                              ? 'bg-green-500/20 text-green-400'
                              : parseFloat(c.rate) >= 50
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-red-500/20 text-red-400'
                          }`}>
                            {c.rate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3 mt-4">
            <Button
              onClick={() => downloadCSV(
                `${schoolName}_attendance.csv`,
                ['Class', 'Present', 'Absent', 'Attendance %'],
                attendanceByClass.map(c => [c.className, String(c.present), String(c.absent), `${c.rate}%`])
              )}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold"
            >
              <Download className="w-4 h-4 mr-2" />
              Download CSV
            </Button>
            <Button
              onClick={() => downloadPDF(`${schoolName}_attendance.pdf`, 'Attendance Report')}
              disabled={pdfPending}
              variant="outline"
              className="border-slate-700 text-slate-300 hover:text-white hover:border-amber-500"
            >
              <FileText className="w-4 h-4 mr-2" />
              {pdfPending ? 'Generating...' : 'Download PDF'}
            </Button>
          </div>
        </>
      )}

      {/* ── Announcements Tab ────────────────────────────────────────── */}
      {activeTab === 'announcements' && (
        <>
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Announcements Log</CardTitle>
              <p className="text-slate-400 text-sm">{announcements.length} total announcements</p>
            </CardHeader>
            <CardContent>
              {announcements.length === 0 ? (
                <p className="text-slate-400 text-center py-8">No announcements yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="text-left py-3 px-4 text-sm text-slate-400 font-medium">Title</th>
                        <th className="text-left py-3 px-4 text-sm text-slate-400 font-medium">Target</th>
                        <th className="text-left py-3 px-4 text-sm text-slate-400 font-medium">SMS Sent</th>
                        <th className="text-left py-3 px-4 text-sm text-slate-400 font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {announcements.map(a => (
                        <tr key={a.id} className="border-b border-slate-800">
                          <td className="py-3 px-4 text-white">{a.title}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              a.target === 'school' ? 'bg-blue-500/20 text-blue-400'
                                : a.target === 'class' ? 'bg-purple-500/20 text-purple-400'
                                : a.target === 'parent' ? 'bg-green-500/20 text-green-400'
                                : 'bg-amber-500/20 text-amber-400'
                            }`}>
                              {a.target}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-300">{a.sms_sent ? 'Yes' : 'No'}</td>
                          <td className="py-3 px-4 text-slate-400 text-sm">
                            {a.created_at?._seconds ? new Date(a.created_at._seconds * 1000).toLocaleDateString() : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-3 mt-4">
            <Button
              onClick={() => downloadCSV(
                `${schoolName}_announcements.csv`,
                ['Title', 'Target', 'SMS Sent', 'Date'],
                announcements.map(a => [
                  a.title,
                  a.target,
                  a.sms_sent ? 'Yes' : 'No',
                  a.created_at?._seconds ? new Date(a.created_at._seconds * 1000).toLocaleDateString() : '—',
                ])
              )}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold"
            >
              <Download className="w-4 h-4 mr-2" />
              Download CSV
            </Button>
            <Button
              onClick={() => downloadPDF(`${schoolName}_announcements.pdf`, 'Announcements Log')}
              disabled={pdfPending}
              variant="outline"
              className="border-slate-700 text-slate-300 hover:text-white hover:border-amber-500"
            >
              <FileText className="w-4 h-4 mr-2" />
              {pdfPending ? 'Generating...' : 'Download PDF'}
            </Button>
          </div>
        </>
      )}

      </div>
    </div>
  )
}
