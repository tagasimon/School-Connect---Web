'use client'

import { useActionState } from 'react'
import { login, type LoginState } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield, Users, GraduationCap, Wallet, Smartphone } from 'lucide-react'

const ROLE_OPTIONS = [
  { value: 'super_admin', label: 'Super Admin', icon: Shield },
  { value: 'school_admin', label: 'School Admin', icon: Users },
  { value: 'teacher', label: 'Teacher', icon: GraduationCap },
  { value: 'accountant', label: 'Accountant', icon: Wallet },
  { value: 'parent', label: 'Parent', icon: Smartphone },
] as const

export default function LoginPage() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, null)

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Brand */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-amber-500 text-slate-950 font-bold text-xl">
            SC
          </div>
          <h1 className="text-2xl font-bold text-white">SchoolConnect</h1>
          <p className="text-slate-400 text-sm">Staff portal — Uganda</p>
        </div>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-4">
            <CardTitle className="text-white text-lg">Sign in</CardTitle>
            <CardDescription className="text-slate-400">
              Select your role and enter credentials
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={action} className="space-y-4">
              {state?.error && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
                  {state.error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="role" className="text-slate-300">Role</Label>
                <Select name="role" defaultValue="school_admin">
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white focus:border-amber-500">
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((role) => {
                      const Icon = role.icon
                      return (
                        <SelectItem key={role.value} value={role.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {role.label}
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@school.ac.ug"
                  required
                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-amber-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-300">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-amber-500"
                />
              </div>

              <Button
                type="submit"
                disabled={pending}
                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold disabled:opacity-60"
              >
                {pending ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-slate-600">
          SchoolConnect · Elastic Technologies Ltd · Uganda
        </p>
      </div>
    </div>
  )
}
