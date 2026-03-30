import { redirect } from 'next/navigation'
import { getSessionUid } from '@/lib/firebase/session'
import { getCurrentProfile, countCollection } from '@/lib/firebase/queries'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { GraduationCap, Users, BookOpen, Megaphone } from 'lucide-react'

export default async function SchoolAdminPage() {
  const uid = await getSessionUid()
  if (!uid) redirect('/login')

  const profile = await getCurrentProfile(uid)
  if (!profile?.school_id) redirect('/login')
  const schoolId = profile.school_id

  const [studentCount, teacherCount, classCount, announcementCount] = await Promise.all([
    countCollection('students', { school_id: schoolId, status: 'active' }),
    countCollection('users', { school_id: schoolId, role: 'teacher' }),
    countCollection('classes', { school_id: schoolId }),
    countCollection('announcements', { school_id: schoolId }),
  ])

  const stats = [
    { label: 'Students', value: studentCount, icon: GraduationCap, color: 'text-blue-400' },
    { label: 'Teachers', value: teacherCount, icon: Users, color: 'text-green-400' },
    { label: 'Classes', value: classCount, icon: BookOpen, color: 'text-amber-400' },
    { label: 'Announcements', value: announcementCount, icon: Megaphone, color: 'text-purple-400' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Welcome, {profile.full_name}</h1>
        <p className="text-slate-400 text-sm mt-1">School admin dashboard</p>
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
    </div>
  )
}
