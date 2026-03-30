'use client'

import { logout } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'
import { LogOut, User } from 'lucide-react'

interface TopBarProps {
  profile: {
    full_name: string
    role: string
    email: string
  }
}

export function TopBar({ profile }: TopBarProps) {
  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-2">
        <span className="text-slate-400 text-sm capitalize">
          {profile.role.replace('_', ' ')}
        </span>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm">
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
            <User className="w-4 h-4 text-slate-300" />
          </div>
          <span className="text-slate-300 hidden sm:block">{profile.full_name}</span>
        </div>

        <form action={logout}>
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </header>
  )
}
