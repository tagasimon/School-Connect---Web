'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, Users, Building2, GraduationCap, DollarSign, Activity } from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

interface AnalyticsPageProps {
  totalSchools: number
  totalStudents: number
  totalTeachers: number
  totalFees: number
  totalCollected: number
  activeSchools: number
  trialSchools: number
  inactiveSchools: number
  recentSchools: number
  estimatedMonthlyRevenue: number
  monthlyRevenue: Array<{ month: string; collected: number }>
  topSchools: Array<{ id: string; name: string; count: number }>
}

export default function AnalyticsPage({
  totalSchools,
  totalStudents,
  totalTeachers,
  totalFees,
  totalCollected,
  activeSchools,
  trialSchools,
  inactiveSchools,
  recentSchools,
  estimatedMonthlyRevenue,
  monthlyRevenue,
  topSchools,
}: AnalyticsPageProps) {
  const subscriptionData = [
    { name: 'Active', value: activeSchools, color: '#22c55e' },
    { name: 'Trial', value: trialSchools, color: '#f59e0b' },
    { name: 'Inactive', value: inactiveSchools, color: '#ef4444' },
  ].filter(d => d.value > 0)

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
            <p className="text-2xl font-bold text-white">{totalSchools}</p>
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

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Monthly Revenue AreaChart */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-400" />
              Monthly Contract Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyRevenue.length === 0 ? (
              <p className="text-slate-400 text-center py-8">No payment data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    tickFormatter={v => {
                      const [y, m] = v.split('-')
                      return `${m}/${y}`
                    }}
                  />
                  <YAxis
                    tickFormatter={v => `${(v / 1000).toFixed(0)}K`}
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={v => `UGX ${Number(v).toLocaleString()}`}
                    labelFormatter={label => {
                      const [y, m] = label.split('-')
                      return `${m}/${y}`
                    }}
                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="collected"
                    stroke="#f59e0b"
                    fill="#f59e0b20"
                    name="Collected"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Subscription PieChart */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-amber-400" />
              Subscription Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {subscriptionData.length === 0 ? (
              <p className="text-slate-400 text-center py-8">No subscription data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={subscriptionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {subscriptionData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

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
              topSchools.map(({ id, name, count }, index) => (
                <div key={id} className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium">{name}</p>
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
    </div>
  )
}
