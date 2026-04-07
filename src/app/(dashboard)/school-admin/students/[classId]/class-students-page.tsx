'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ArrowLeft,
  Plus,
  Users,
  Phone,
  DollarSign,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react'

interface StudentData {
  id: string
  full_name: string
  student_number: string | null
  gender: string | null
  status: string
  date_of_birth: string
  parent: { name: string; phone: string; relationship: string } | null
  commitments: Array<{ id: string; name: string; amount: number }>
  fee: { id: string; total_amount: number; amount_paid: number } | null
}

export default function ClassStudentsPage({
  schoolId,
  classId,
  className,
  students,
}: {
  schoolId: string
  classId: string
  className: string
  students: StudentData[]
}) {
  const totalFees = students.reduce((sum, s) => sum + (s.fee?.total_amount || 0), 0)
  const totalPaid = students.reduce((sum, s) => sum + (s.fee?.amount_paid || 0), 0)
  const fullyPaid = students.filter(s => s.fee && s.fee.amount_paid >= s.fee.total_amount).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            asChild
            className="border-slate-700 text-slate-400 hover:text-white hover:border-amber-500"
          >
            <Link href="/school-admin/students">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Classes
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-white">{className}</h1>
            <p className="text-slate-400 text-sm mt-1">{students.length} students</p>
          </div>
        </div>
        <Button
          asChild
          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold"
        >
          <Link href={`/school-admin/students/add?class=${classId}`}>
            <Plus className="w-4 h-4 mr-2" />
            Add Student
          </Link>
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Students</CardTitle>
            <Users className="w-4 h-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">{students.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Total Fees</CardTitle>
            <DollarSign className="w-4 h-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">UGX {totalFees.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Fully Paid</CardTitle>
            <CheckCircle className="w-4 h-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">{fullyPaid}/{students.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Student List */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Students</CardTitle>
        </CardHeader>
        <CardContent>
          {students.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-400 mb-4">No students in this class yet.</p>
              <Button
                asChild
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold"
              >
                <Link href={`/school-admin/students/add?class=${classId}`}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Student
                </Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-4 text-sm text-slate-400 font-medium">Student</th>
                    <th className="text-left py-3 px-4 text-sm text-slate-400 font-medium">Parent / Guardian</th>
                    <th className="text-right py-3 px-4 text-sm text-slate-400 font-medium">Total</th>
                    <th className="text-right py-3 px-4 text-sm text-slate-400 font-medium">Paid</th>
                    <th className="text-right py-3 px-4 text-sm text-slate-400 font-medium">Balance</th>
                    <th className="text-center py-3 px-4 text-sm text-slate-400 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => {
                    const balance = student.fee ? student.fee.total_amount - student.fee.amount_paid : null
                    const isPaid = student.fee && student.fee.amount_paid >= student.fee.total_amount

                    return (
                      <tr key={student.id} className="border-b border-slate-800">
                        <td className="py-3 px-4">
                          <p className="text-white">{student.full_name}</p>
                          {student.student_number && (
                            <p className="text-slate-500 text-xs">#{student.student_number}</p>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {student.parent ? (
                            <div>
                              <p className="text-slate-300 text-sm">{student.parent.name}</p>
                              <p className="text-slate-500 text-xs flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {student.parent.phone}
                              </p>
                            </div>
                          ) : (
                            <span className="text-slate-500 text-xs">No parent linked</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right text-white">
                          {student.fee ? `UGX ${student.fee.total_amount.toLocaleString()}` : '—'}
                        </td>
                        <td className="py-3 px-4 text-right text-green-400">
                          {student.fee ? `UGX ${student.fee.amount_paid.toLocaleString()}` : '—'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {balance !== null && balance > 0 ? (
                            <span className="text-red-400 font-semibold">UGX {balance.toLocaleString()}</span>
                          ) : isPaid ? (
                            <span className="text-slate-500">—</span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {!student.fee ? (
                            <span className="px-2 py-1 rounded text-xs bg-slate-700 text-slate-400">No Fee</span>
                          ) : isPaid ? (
                            <span className="px-2 py-1 rounded text-xs bg-green-500/20 text-green-400">
                              <CheckCircle className="w-3 h-3 inline mr-1" />
                              Paid
                            </span>
                          ) : student.fee.amount_paid > 0 ? (
                            <span className="px-2 py-1 rounded text-xs bg-amber-500/20 text-amber-400">Partial</span>
                          ) : (
                            <span className="px-2 py-1 rounded text-xs bg-red-500/20 text-red-400">
                              <AlertTriangle className="w-3 h-3 inline mr-1" />
                              Unpaid
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
