'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, Upload, Plus, GraduationCap, ChevronRight } from 'lucide-react'

export default function StudentsPage({
  schoolId,
  classes,
  studentsByClass,
  totalStudents,
}: {
  schoolId: string
  classes: Array<{ id: string; name: string }>
  studentsByClass: Record<string, number>
  totalStudents: number
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Students</h1>
          <p className="text-slate-400 text-sm mt-1">Manage students by class</p>
        </div>
        <div className="flex gap-2">
          <Button
            asChild
            variant="outline"
            className="border-slate-700 text-slate-400 hover:text-white hover:border-amber-500"
          >
            <Link href="/school-admin/students/import">
              <Upload className="w-4 h-4 mr-2" />
              Import CSV
            </Link>
          </Button>
          <Button
            asChild
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold"
          >
            <Link href="/school-admin/students/add">
              <Plus className="w-4 h-4 mr-2" />
              Add Student
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Total Students</CardTitle>
            <Users className="w-4 h-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">{totalStudents}</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Classes</CardTitle>
            <GraduationCap className="w-4 h-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">{classes.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Avg per Class</CardTitle>
            <Users className="w-4 h-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">
              {classes.length > 0 ? Math.round(totalStudents / classes.length) : 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Classes Grid — click to view students */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Students by Class</CardTitle>
          <p className="text-slate-400 text-sm">Select a class to view and manage its students</p>
        </CardHeader>
        <CardContent>
          {classes.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-400 mb-4">No classes created yet.</p>
              <Button asChild className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold">
                <Link href="/school-admin/classes">Create Classes</Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {classes.map((cls) => (
                <Link
                  key={cls.id}
                  href={`/school-admin/students/${cls.id}`}
                  className="flex items-center justify-between p-4 rounded-lg border border-slate-700 bg-slate-800/50 hover:border-amber-500 transition-colors group"
                >
                  <div>
                    <p className="text-white font-medium">{cls.name}</p>
                    <p className="text-slate-400 text-sm">
                      {studentsByClass[cls.id] || 0} student{(studentsByClass[cls.id] || 0) !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-colors" />
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
