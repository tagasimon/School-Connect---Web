'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Users, Plus, Phone, Mail, GraduationCap, ChevronRight, Search, X, ShieldCheck, ShieldOff } from 'lucide-react'
import { phoneToAuthEmail } from '@/lib/utils/phone'

type Parent = {
  id: string
  name: string
  phone: string
  hasAuthAccount: boolean
  students: { studentId: string; studentName: string; relationship: string }[]
}

export default function ParentsPage({
  schoolId,
  parents,
}: {
  schoolId: string
  parents: Parent[]
}) {
  const [query, setQuery] = useState('')

  const filtered = query.trim()
    ? parents.filter(p => {
        const q = query.toLowerCase()
        return (
          p.name.toLowerCase().includes(q) ||
          p.phone.includes(q) ||
          phoneToAuthEmail(p.phone).toLowerCase().includes(q)
        )
      })
    : parents

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Parents</h1>
          <p className="text-slate-400 text-sm mt-1">Manage parent accounts and student links</p>
        </div>
        <Button asChild className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold">
          <Link href="/school-admin/parents/add">
            <Plus className="w-4 h-4 mr-2" />
            Add Parent
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Total Parents</CardTitle>
            <Users className="w-4 h-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">{parents.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Students Linked</CardTitle>
            <GraduationCap className="w-4 h-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">
              {new Set(parents.flatMap(p => p.students.map(s => s.studentId))).size}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800 sm:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">App Login Enabled</CardTitle>
            <ShieldCheck className="w-4 h-4 text-green-400" />
          </CardHeader>
          <CardContent className="flex items-end gap-3">
            <p className="text-2xl font-bold text-white">
              {parents.filter(p => p.hasAuthAccount).length}
            </p>
            <p className="text-sm text-slate-500 mb-0.5">
              of {parents.length} parents can log into the mobile app
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">All Parents</CardTitle>
          <p className="text-slate-400 text-sm">Click a parent to view details and manage student links</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {parents.length > 0 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
              <Input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search by name, phone, or email..."
                className="pl-9 pr-9 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-amber-500"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {parents.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-400 mb-4">No parents yet. Add a student to automatically create a parent account.</p>
              <Button asChild className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold">
                <Link href="/school-admin/students/add">Add Student</Link>
              </Button>
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-8">No parents match &quot;{query}&quot;</p>
          ) : (
            <div className="space-y-2">
              {filtered.map(parent => (
                <Link
                  key={parent.id}
                  href={`/school-admin/parents/${parent.id}`}
                  className="flex items-center justify-between p-4 rounded-lg border border-slate-700 bg-slate-800/50 hover:border-amber-500 transition-colors group"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-white font-medium">{parent.name}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Phone className="w-3 h-3 text-slate-500" />
                      <p className="text-slate-400 text-sm">{parent.phone}</p>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Mail className="w-3 h-3 text-slate-500" />
                      <p className="text-slate-500 text-xs font-mono">{phoneToAuthEmail(parent.phone)}</p>
                    </div>
                    {parent.students.length > 0 && (
                      <p className="text-slate-500 text-xs mt-1">
                        {parent.students.map(s => s.studentName).join(', ')}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    {parent.hasAuthAccount ? (
                      <span className="flex items-center gap-1 text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded-full">
                        <ShieldCheck className="w-3 h-3" />
                        Can Login
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-slate-500 bg-slate-700/50 px-2 py-1 rounded-full">
                        <ShieldOff className="w-3 h-3" />
                        No Login
                      </span>
                    )}
                    <span className="text-xs text-slate-500 bg-slate-700 px-2 py-1 rounded-full">
                      {parent.students.length} {parent.students.length === 1 ? 'child' : 'children'}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-colors" />
                  </div>
                </Link>
              ))}
              {query && (
                <p className="text-xs text-slate-600 text-center pt-1">
                  {filtered.length} of {parents.length} parents
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
