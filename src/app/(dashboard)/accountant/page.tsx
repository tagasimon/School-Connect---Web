import { redirect } from 'next/navigation'
import { getSessionUid } from '@/lib/firebase/session'
import { getCurrentProfile, getFeesBySchool } from '@/lib/firebase/queries'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DollarSign, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react'

export default async function AccountantPage() {
  const uid = await getSessionUid()
  if (!uid) redirect('/login')

  const profile = await getCurrentProfile(uid)
  if (!profile?.school_id) redirect('/login')

  const fees = await getFeesBySchool(profile.school_id)

  const totalOwed = fees.reduce((sum, f) => sum + f.total_amount, 0)
  const totalPaid = fees.reduce((sum, f) => sum + f.amount_paid, 0)
  const totalBalance = totalOwed - totalPaid
  const fullyPaid = fees.filter(f => f.amount_paid >= f.total_amount).length
  const outstanding = fees.filter(f => f.amount_paid < f.total_amount).length

  const stats = [
    { label: 'Total Billed', value: `UGX ${totalOwed.toLocaleString()}`, icon: DollarSign, color: 'text-amber-400' },
    { label: 'Total Collected', value: `UGX ${totalPaid.toLocaleString()}`, icon: TrendingUp, color: 'text-green-400' },
    { label: 'Outstanding', value: `UGX ${totalBalance.toLocaleString()}`, icon: AlertTriangle, color: 'text-red-400' },
    { label: 'Fully Paid', value: `${fullyPaid} students`, icon: CheckCircle, color: 'text-blue-400' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Fee Management</h1>
        <p className="text-slate-400 text-sm mt-1">{outstanding} students with outstanding balances</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label} className="bg-slate-900 border-slate-800">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-400">{stat.label}</CardTitle>
                <Icon className={`w-4 h-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold text-white">{stat.value}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
