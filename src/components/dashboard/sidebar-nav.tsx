'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/types'
import {
  LayoutDashboard,
  School,
  Users,
  BookOpen,
  ClipboardList,
  Megaphone,
  DollarSign,
  BarChart3,
  Settings,
  GraduationCap,
} from 'lucide-react'

const NAV_BY_ROLE: Record<UserRole, { href: string; label: string; icon: React.ElementType }[]> = {
  super_admin: [
    { href: '/super-admin', label: 'Overview', icon: LayoutDashboard },
    { href: '/super-admin/schools', label: 'Schools', icon: School },
    { href: '/super-admin/analytics', label: 'Analytics', icon: BarChart3 },
  ],
  school_admin: [
    { href: '/school-admin', label: 'Overview', icon: LayoutDashboard },
    { href: '/school-admin/students', label: 'Students', icon: GraduationCap },
    { href: '/school-admin/teachers', label: 'Teachers', icon: Users },
    { href: '/school-admin/classes', label: 'Classes', icon: BookOpen },
    { href: '/school-admin/announcements', label: 'Announcements', icon: Megaphone },
    { href: '/school-admin/settings', label: 'Settings', icon: Settings },
  ],
  teacher: [
    { href: '/teacher', label: 'Overview', icon: LayoutDashboard },
    { href: '/teacher/attendance', label: 'Attendance', icon: ClipboardList },
    { href: '/teacher/results', label: 'Results', icon: BookOpen },
    { href: '/teacher/announcements', label: 'Announcements', icon: Megaphone },
  ],
  accountant: [
    { href: '/accountant', label: 'Overview', icon: LayoutDashboard },
    { href: '/accountant/fees', label: 'Fees', icon: DollarSign },
    { href: '/accountant/reports', label: 'Reports', icon: BarChart3 },
  ],
  parent: [],
}

export function SidebarNav({ role }: { role: UserRole }) {
  const pathname = usePathname()
  const navItems = NAV_BY_ROLE[role] ?? []

  return (
    <aside className="w-60 shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-slate-800">
        <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-slate-950 font-bold text-sm">
          SC
        </div>
        <span className="text-white font-semibold text-sm">SchoolConnect</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                active
                  ? 'bg-amber-500/10 text-amber-400 font-medium'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t border-slate-800">
        <p className="text-xs text-slate-600 text-center">
          Elastic Technologies Ltd
        </p>
      </div>
    </aside>
  )
}
