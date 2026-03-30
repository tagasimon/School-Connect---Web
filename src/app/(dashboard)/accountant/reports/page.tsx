import { redirect } from 'next/navigation'
import { getSessionUid } from '@/lib/firebase/session'
import { getCurrentProfile } from '@/lib/firebase/queries'
import { adminDb } from '@/lib/firebase/admin'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DollarSign, TrendingUp, Users, FileText, CheckCircle, AlertTriangle, TrendingDown } from 'lucide-react'

export default async function AccountantReportsPage() {
  const uid = await getSessionUid()
  if (!uid) redirect('/login')

  const profile = await getCurrentProfile(uid)
  if (!profile?.school_id) redirect('/login')

  const [feesSnap, termsSnap, studentsSnap] = await Promise.all([
    adminDb().collection('fees').where('school_id', '==', profile.school_id).get(),
    adminDb().collection('terms').where('school_id', '==', profile.school_id).get(),
    adminDb().collection('students').where('school_id', '==', profile.school_id).get(),
  ])

  const fees = feesSnap.docs.map(doc => doc.data())
  const terms = termsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as any)
  const totalStudents = studentsSnap.size

  const totalBilled = fees.reduce((sum, f) => sum + (f.total_amount as number), 0)
  const totalPaid = fees.reduce((sum, f) => sum + (f.amount_paid as number), 0)
  const totalBalance = totalBilled - totalPaid
  const collectionRate = totalBilled > 0 ? ((totalPaid / totalBilled) * 100).toFixed(1) : '0'

  const fullyPaidCount = fees.filter(f => (f.amount_paid as number) >= (f.total_amount as number)).length
  const partialCount = fees.filter(f => (f.amount_paid as number) > 0 && (f.amount_paid as number) < (f.total_amount as number)).length
  const unpaidCount = fees.filter(f => (f.amount_paid as number) === 0).length
  const totalRecords = fees.length

  // Fees by term
  const feesByTerm = terms.map(term => {
    const termFees = fees.filter(f => f.term_id === term.id)
    return {
      term: term.name,
      year: term.year,
      billed: termFees.reduce((sum, f) => sum + (f.total_amount as number), 0),
      paid: termFees.reduce((sum, f) => sum + (f.amount_paid as number), 0),
      count: termFees.length,
    }
  })

  // Calculate percentages for pie chart
  const fullyPaidPercent = totalRecords > 0 ? (fullyPaidCount / totalRecords) * 100 : 0
  const partialPercent = totalRecords > 0 ? (partialCount / totalRecords) * 100 : 0
  const unpaidPercent = totalRecords > 0 ? (unpaidCount / totalRecords) * 100 : 0

  // Pie chart circumference (r=60, C=2πr≈377)
  const CIRCUMFERENCE = 377
  const fullyPaidOffset = CIRCUMFERENCE - (fullyPaidPercent / 100) * CIRCUMFERENCE
  const partialOffset = CIRCUMFERENCE - (partialPercent / 100) * CIRCUMFERENCE

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Financial Reports</h1>
        <p className="text-slate-400 text-sm mt-1">Overview of school fee collections</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
            <TrendingUp className="w-4 h-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-white">UGX {totalPaid.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Outstanding</CardTitle>
            <AlertTriangle className="w-4 h-4 text-red-400" />
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-white">UGX {totalBalance.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Collection Rate</CardTitle>
            <FileText className="w-4 h-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-white">{collectionRate}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Collection Rate Progress Bar */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-amber-400" />
            Overall Collection Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="relative h-6 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-500"
                style={{ width: `${collectionRate}%` }}
              />
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">UGX {totalPaid.toLocaleString()} collected</span>
              <span className="text-slate-400">UGX {totalBilled.toLocaleString()} target</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              {parseFloat(collectionRate) >= 80 ? (
                <span className="flex items-center text-green-400">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  Excellent collection rate!
                </span>
              ) : parseFloat(collectionRate) >= 50 ? (
                <span className="flex items-center text-amber-400">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  Good progress, keep going
                </span>
              ) : (
                <span className="flex items-center text-red-400">
                  <TrendingDown className="w-4 h-4 mr-1" />
                  Needs attention
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Status Distribution with Donut Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-400" />
              Payment Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              {/* Donut Chart */}
              <div className="relative w-32 h-32 flex-shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 140 140">
                  {/* Background circle */}
                  <circle
                    cx="70"
                    cy="70"
                    r="60"
                    fill="none"
                    stroke="#1e293b"
                    strokeWidth="20"
                  />
                  {/* Fully Paid - Green */}
                  <circle
                    cx="70"
                    cy="70"
                    r="60"
                    fill="none"
                    stroke="#22c55e"
                    strokeWidth="20"
                    strokeDasharray={CIRCUMFERENCE}
                    strokeDashoffset={CIRCUMFERENCE - (fullyPaidPercent / 100) * CIRCUMFERENCE}
                    className="transition-all duration-500"
                  />
                  {/* Partially Paid - Amber */}
                  <circle
                    cx="70"
                    cy="70"
                    r="60"
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="20"
                    strokeDasharray={CIRCUMFERENCE}
                    strokeDashoffset={CIRCUMFERENCE - ((fullyPaidPercent + partialPercent) / 100) * CIRCUMFERENCE}
                    style={{ transformOrigin: 'center', transform: `rotate(${(fullyPaidPercent / 100) * 360}deg)` }}
                    className="transition-all duration-500"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">{totalRecords}</span>
                </div>
              </div>

              {/* Legend */}
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="text-sm text-slate-300">Fully Paid</span>
                  </div>
                  <span className="text-sm font-semibold text-white">{fullyPaidCount} ({fullyPaidPercent.toFixed(1)}%)</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <span className="text-sm text-slate-300">Partially Paid</span>
                  </div>
                  <span className="text-sm font-semibold text-white">{partialCount} ({partialPercent.toFixed(1)}%)</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span className="text-sm text-slate-300">Unpaid</span>
                  </div>
                  <span className="text-sm font-semibold text-white">{unpaidCount} ({unpaidPercent.toFixed(1)}%)</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Quick Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
                <CheckCircle className="w-6 h-6 text-green-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-green-400">{fullyPaidCount}</p>
                <p className="text-xs text-slate-400 mt-1">Fully Paid Students</p>
              </div>
              <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
                <AlertTriangle className="w-6 h-6 text-amber-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-amber-400">{partialCount + unpaidCount}</p>
                <p className="text-xs text-slate-400 mt-1">With Balance</p>
              </div>
              <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center">
                <Users className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-blue-400">{totalStudents}</p>
                <p className="text-xs text-slate-400 mt-1">Total Students</p>
              </div>
              <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20 text-center">
                <FileText className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-purple-400">{terms.length}</p>
                <p className="text-xs text-slate-400 mt-1">Academic Terms</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fees by Term Bar Chart */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Fees by Term</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Bar Chart */}
            <div className="space-y-3">
              {feesByTerm.map((item) => {
                const collectionPercent = item.billed > 0 ? ((item.paid / item.billed) * 100).toFixed(0) : '0'
                const balance = item.billed - item.paid
                return (
                  <div key={item.term} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white font-medium">{item.term} {item.year}</span>
                      <span className="text-slate-400">{item.count} students</span>
                    </div>
                    <div className="relative h-8 bg-slate-800 rounded-lg overflow-hidden">
                      <div className="absolute inset-0 flex">
                        {/* Paid portion - green */}
                        <div 
                          className="bg-gradient-to-r from-green-600 to-green-500 transition-all duration-500 flex items-center justify-end px-2"
                          style={{ width: `${(item.paid / Math.max(item.billed, 1)) * 100}%` }}
                        >
                          {item.paid > 0 && (
                            <span className="text-xs text-white font-medium whitespace-nowrap">
                              UGX {(item.paid / 1000).toFixed(0)}K
                            </span>
                          )}
                        </div>
                        {/* Unpaid portion - red */}
                        {balance > 0 && (
                          <div 
                            className="bg-gradient-to-r from-red-600 to-red-500 transition-all duration-500 flex-1 flex items-center justify-start px-2"
                          >
                            <span className="text-xs text-white font-medium whitespace-nowrap">
                              UGX {(balance / 1000).toFixed(0)}K
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center text-green-400">
                          <span className="w-2 h-2 rounded-full bg-green-500 mr-1" />
                          Paid: UGX {item.paid.toLocaleString()}
                        </span>
                        <span className="flex items-center text-red-400">
                          <span className="w-2 h-2 rounded-full bg-red-500 mr-1" />
                          Balance: UGX {balance.toLocaleString()}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        parseFloat(collectionPercent) >= 80 
                          ? 'bg-green-500/20 text-green-400' 
                          : parseFloat(collectionPercent) >= 50 
                            ? 'bg-amber-500/20 text-amber-400' 
                            : 'bg-red-500/20 text-red-400'
                      }`}>
                        {collectionPercent}% collected
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Summary Table */}
            <div className="pt-4 border-t border-slate-700">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-2 px-3 text-xs text-slate-400 font-medium">Term</th>
                    <th className="text-right py-2 px-3 text-xs text-slate-400 font-medium">Students</th>
                    <th className="text-right py-2 px-3 text-xs text-slate-400 font-medium">Total Billed</th>
                    <th className="text-right py-2 px-3 text-xs text-slate-400 font-medium">Total Paid</th>
                    <th className="text-right py-2 px-3 text-xs text-slate-400 font-medium">Balance</th>
                    <th className="text-right py-2 px-3 text-xs text-slate-400 font-medium">Collection %</th>
                  </tr>
                </thead>
                <tbody>
                  {feesByTerm.map((item) => {
                    const balance = item.billed - item.paid
                    const rate = item.billed > 0 ? ((item.paid / item.billed) * 100).toFixed(1) : '0'
                    return (
                      <tr key={item.term} className="border-b border-slate-800">
                        <td className="py-2 px-3 text-white text-sm">{item.term} {item.year}</td>
                        <td className="py-2 px-3 text-right text-slate-300 text-sm">{item.count}</td>
                        <td className="py-2 px-3 text-right text-white text-sm">UGX {item.billed.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right text-green-400 text-sm">UGX {item.paid.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right text-red-400 text-sm">UGX {balance.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right text-sm">
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            parseFloat(rate) >= 80 
                              ? 'bg-green-500/20 text-green-400' 
                              : parseFloat(rate) >= 50 
                                ? 'bg-amber-500/20 text-amber-400' 
                                : 'bg-red-500/20 text-red-400'
                          }`}>
                            {rate}%
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
