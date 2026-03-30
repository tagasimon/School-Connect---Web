import { redirect } from 'next/navigation'
import { getSessionUid } from '@/lib/firebase/session'
import { getCurrentProfile } from '@/lib/firebase/queries'
import { adminDb } from '@/lib/firebase/admin'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Users, Building2, GraduationCap, DollarSign, Activity, Calendar } from 'lucide-react'

export default async function SuperAdminAnalyticsPage() {
  const uid = await getSessionUid()
  if (!uid) redirect('/login')

  const profile = await getCurrentProfile(uid)
  if (!profile) redirect('/login')

  const [schoolsSnap, studentsSnap, teachersSnap, feesSnap] = await Promise.all([
    adminDb().collection('schools').get(),
    adminDb().collection('students').get(),
    adminDb().collection('users').where('role', '==', 'teacher').get(),
    adminDb().collection('fees').get(),
  ])

  const schools = schoolsSnap.docs.map(doc => doc.data())
  const totalStudents = studentsSnap.size
  const totalTeachers = teachersSnap.size
  const totalFees = feesSnap.docs.reduce((sum, doc) => {
    const data = doc.data()
    return sum + (data.total_amount as number || 0)
  }, 0)
  const totalCollected = feesSnap.docs.reduce((sum, doc) => {
    const data = doc.data()
    return sum + (data.amount_paid as number || 0)
  }, 0)

  const activeSchools = schools.filter(s => s.subscription_status === 'active').length
  const trialSchools = schools.filter(s => s.subscription_status === 'trial').length
  const inactiveSchools = schools.filter(s => s.subscription_status === 'inactive').length

  // Platform growth (mock data based on created_at)
  const recentSchools = schools.filter(
    s => s.created_at && new Date(s.created_at as any) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  ).length

  // Revenue breakdown by subscription
  const estimatedMonthlyRevenue = activeSchools * 50000 // Assuming 50K UGX per school per month

  // Top schools by student count
  const schoolStudentCounts: Record<string, number> = {}
  schools.forEach(school => {
    schoolStudentCounts[school.id] = 0
  })

  studentsSnap.docs.forEach(doc => {
    const data = doc.data()
    if (data.school_id && schoolStudentCounts[data.school_id] !== undefined) {
      schoolStudentCounts[data.school_id]++
    }
  })

  const topSchools = Object.entries(schoolStudentCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  const schoolNames = await Promise.all(
    topSchools.map(async ([schoolId]) => {
      const doc = await adminDb().collection('schools').doc(schoolId).get()
      return doc.exists ? doc.data()?.name : 'Unknown'
    })
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <p className="text-slate-400 text-sm mt-1">Platform-wide insights and metrics</p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Total Schools</CardTitle>
            <Building2 className="w-4 h-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">{schools.length}</p>
            <div className="flex items-center gap-1 mt-2 text-xs">
              <TrendingUp className="w-3 h-3 text-green-400" />
              <span className="text-green-400">+{recentSchools}</span>
              <span className="text-slate-500">this month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Total Students</CardTitle>
            <GraduationCap className="w-4 h-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">{totalStudents.toLocaleString()}</p>
            <p className="text-xs text-slate-500 mt-2">Across all schools</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Total Teachers</CardTitle>
            <Users className="w-4 h-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">{totalTeachers.toLocaleString()}</p>
            <p className="text-xs text-slate-500 mt-2">Registered teachers</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Est. Monthly Revenue</CardTitle>
            <DollarSign className="w-4 h-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">UGX {estimatedMonthlyRevenue.toLocaleString()}</p>
            <p className="text-xs text-slate-500 mt-2">Based on active subscriptions</p>
          </CardContent>
        </Card>
      </div>

      {/* Subscription Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-amber-400" />
              Subscription Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Progress bars */}
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-green-400">Active</span>
                    <span className="text-slate-400">{activeSchools} schools</span>
                  </div>
                  <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-green-600 to-green-500"
                      style={{ width: `${schools.length > 0 ? (activeSchools / schools.length) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-blue-400">Trial</span>
                    <span className="text-slate-400">{trialSchools} schools</span>
                  </div>
                  <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-600 to-blue-500"
                      style={{ width: `${schools.length > 0 ? (trialSchools / schools.length) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-red-400">Inactive</span>
                    <span className="text-slate-400">{inactiveSchools} schools</span>
                  </div>
                  <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-red-600 to-red-500"
                      style={{ width: `${schools.length > 0 ? (inactiveSchools / schools.length) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fee Collection Overview */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-400" />
              Platform Fee Collection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-slate-800">
                  <p className="text-slate-400 text-sm">Total Billed</p>
                  <p className="text-xl font-bold text-white">UGX {totalFees.toLocaleString()}</p>
                </div>
                <div className="p-4 rounded-lg bg-slate-800">
                  <p className="text-slate-400 text-sm">Total Collected</p>
                  <p className="text-xl font-bold text-green-400">UGX {totalCollected.toLocaleString()}</p>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-400">Collection Rate</span>
                  <span className="text-white font-medium">
                    {totalFees > 0 ? ((totalCollected / totalFees) * 100).toFixed(1) : 0}%
                  </span>
                </div>
                <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-green-600 to-green-500"
                    style={{ width: `${totalFees > 0 ? (totalCollected / totalFees) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <div className="pt-2 border-t border-slate-700">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Outstanding</span>
                  <span className="text-red-400 font-medium">
                    UGX {(totalFees - totalCollected).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Schools */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-amber-400" />
            Top Schools by Student Count
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topSchools.length === 0 ? (
              <p className="text-slate-400 text-center py-8">No data available yet.</p>
            ) : (
              topSchools.map(([schoolId, count], index) => (
                <div key={schoolId} className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium">{schoolNames[index] || 'Unknown School'}</p>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden mt-1">
                      <div 
                        className="h-full bg-gradient-to-r from-amber-600 to-amber-500"
                        style={{ width: `${totalStudents > 0 ? (count / totalStudents) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-semibold">{count}</p>
                    <p className="text-slate-500 text-xs">students</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-400" />
            Platform Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 rounded-lg bg-slate-800">
              <Building2 className="w-6 h-6 text-amber-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{schools.length}</p>
              <p className="text-xs text-slate-400 mt-1">Total Schools</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-slate-800">
              <GraduationCap className="w-6 h-6 text-blue-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{totalStudents.toLocaleString()}</p>
              <p className="text-xs text-slate-400 mt-1">Total Students</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-slate-800">
              <Users className="w-6 h-6 text-green-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{totalTeachers.toLocaleString()}</p>
              <p className="text-xs text-slate-400 mt-1">Total Teachers</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-slate-800">
              <DollarSign className="w-6 h-6 text-purple-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{((totalCollected / totalFees) * 100) || 0}%</p>
              <p className="text-xs text-slate-400 mt-1">Collection Rate</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
