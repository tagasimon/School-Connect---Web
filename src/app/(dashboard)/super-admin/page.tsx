import { getRecentSchools, countCollection } from '@/lib/firebase/queries'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { School, Users, GraduationCap, Activity } from 'lucide-react'

export default async function SuperAdminPage() {
  const [schoolCount, userCount, studentCount] = await Promise.all([
    countCollection('schools', {}),
    countCollection('users', {}),
    countCollection('students', { status: 'active' }),
  ])

  const recentSchools = await getRecentSchools()

  const stats = [
    { label: 'Total Schools', value: schoolCount, icon: School, color: 'text-amber-400' },
    { label: 'Total Users', value: userCount, icon: Users, color: 'text-blue-400' },
    { label: 'Total Students', value: studentCount, icon: GraduationCap, color: 'text-green-400' },
    { label: 'Active Schools', value: schoolCount, icon: Activity, color: 'text-purple-400' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Platform Overview</h1>
        <p className="text-slate-400 text-sm mt-1">Elastic Technologies · Super Admin</p>
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
                <p className="text-3xl font-bold text-white">{stat.value}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white text-base">Recent Schools</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentSchools.map((school) => (
              <div key={school.id} className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
                <span className="text-slate-300 text-sm">{school.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  school.subscription_status === 'active'
                    ? 'bg-green-500/10 text-green-400'
                    : 'bg-slate-700 text-slate-400'
                }`}>
                  {school.subscription_status}
                </span>
              </div>
            ))}
            {!recentSchools.length && (
              <p className="text-slate-500 text-sm">No schools registered yet.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
