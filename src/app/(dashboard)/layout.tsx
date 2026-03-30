import { redirect } from 'next/navigation'
import { getSessionUid } from '@/lib/firebase/session'
import { getCurrentProfile } from '@/lib/firebase/queries'
import { SidebarNav } from '@/components/dashboard/sidebar-nav'
import { TopBar } from '@/components/dashboard/top-bar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const uid = await getSessionUid()
  if (!uid) redirect('/login')

  const profile = await getCurrentProfile(uid)
  if (!profile) redirect('/login')

  return (
    <div className="min-h-screen bg-slate-950 flex">
      <SidebarNav role={profile.role} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar profile={profile} />
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
