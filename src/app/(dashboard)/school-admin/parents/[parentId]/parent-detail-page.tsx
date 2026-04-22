'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateParentInfo, linkParentToStudent, unlinkParentFromStudent } from '@/lib/actions/parents'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Pencil, Trash2, Plus, X, Check } from 'lucide-react'
import Link from 'next/link'

type Student = {
  linkId: string
  studentId: string
  studentName: string
  classId: string
  className?: string
  relationship: string
  is_primary: boolean
}

type Parent = {
  id: string
  name: string
  phone: string
  email: string
  students: Student[]
}

export default function ParentDetailPage({
  parent,
  unlinkableStudents,
}: {
  parent: Parent
  unlinkableStudents: { id: string; name: string; className: string }[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Edit mode state
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(parent.name)
  const [editPhone, setEditPhone] = useState(parent.phone)
  const [editPassword, setEditPassword] = useState('')
  const [editError, setEditError] = useState('')

  // Link student state
  const [showLinkForm, setShowLinkForm] = useState(false)
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [linkRelationship, setLinkRelationship] = useState('parent')
  const [linkError, setLinkError] = useState('')

  const handleSaveEdit = () => {
    setEditError('')
    startTransition(async () => {
      const result = await updateParentInfo(parent.id, {
        name: editName || undefined,
        phone: editPhone || undefined,
        password: editPassword || undefined,
      })
      if (result.success) {
        setEditing(false)
        setEditPassword('')
        router.refresh()
      }
    })
  }

  const handleUnlink = (linkId: string) => {
    startTransition(async () => {
      await unlinkParentFromStudent(linkId)
      router.refresh()
    })
  }

  const handleLink = () => {
    if (!selectedStudentId) return
    setLinkError('')
    startTransition(async () => {
      const result = await linkParentToStudent(parent.id, selectedStudentId, linkRelationship)
      if (result.success) {
        setShowLinkForm(false)
        setSelectedStudentId('')
        setLinkRelationship('parent')
        router.refresh()
      } else {
        setLinkError(result.error)
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          asChild
          className="border-slate-700 text-slate-400 hover:text-white hover:border-amber-500"
        >
          <Link href="/school-admin/parents">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-white">{parent.name}</h1>
          <p className="text-slate-400 text-sm mt-1">{parent.phone}</p>
        </div>
      </div>

      {/* Parent Info Card */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white">Account Details</CardTitle>
          {!editing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditing(true)}
              className="border-slate-700 text-slate-400 hover:text-white hover:border-amber-500"
            >
              <Pencil className="w-3 h-3 mr-1" />
              Edit
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {editing ? (
            <>
              <div className="space-y-2">
                <label className="text-sm text-slate-300">Full Name</label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-slate-300">Phone Number</label>
                <Input
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-slate-300">New Password (leave blank to keep current)</label>
                <Input
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              {editError && <p className="text-sm text-red-400">{editError}</p>}
              <div className="flex gap-2">
                <Button
                  onClick={handleSaveEdit}
                  disabled={isPending}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold"
                >
                  <Check className="w-4 h-4 mr-1" />
                  Save
                </Button>
                <Button
                  variant="outline"
                  onClick={() => { setEditing(false); setEditName(parent.name); setEditPhone(parent.phone); setEditPassword(''); setEditError('') }}
                  className="border-slate-700 text-slate-400"
                >
                  <X className="w-4 h-4 mr-1" />
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-400 text-sm">Name</span>
                <span className="text-white text-sm">{parent.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 text-sm">Phone</span>
                <span className="text-white text-sm">{parent.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 text-sm">App Login Email</span>
                <span className="text-slate-300 text-sm font-mono text-xs">{parent.email}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Linked Students Card */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white">
            Linked Students
            <span className="ml-2 text-sm font-normal text-slate-400">({parent.students.length})</span>
          </CardTitle>
          {unlinkableStudents.length > 0 && !showLinkForm && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowLinkForm(true)}
              className="border-slate-700 text-slate-400 hover:text-white hover:border-amber-500"
            >
              <Plus className="w-3 h-3 mr-1" />
              Link Student
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {showLinkForm && (
            <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/5 space-y-3">
              <p className="text-amber-400 text-sm font-medium">Link to a Student</p>
              <div className="space-y-2">
                <label className="text-sm text-slate-300">Student</label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">Select a student</option>
                  {unlinkableStudents.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.className})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-slate-300">Relationship</label>
                <select
                  value={linkRelationship}
                  onChange={(e) => setLinkRelationship(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="parent">Parent</option>
                  <option value="guardian">Guardian</option>
                  <option value="sibling">Sibling</option>
                  <option value="other">Other</option>
                </select>
              </div>
              {linkError && <p className="text-sm text-red-400">{linkError}</p>}
              <div className="flex gap-2">
                <Button
                  onClick={handleLink}
                  disabled={isPending || !selectedStudentId}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold"
                >
                  Link
                </Button>
                <Button
                  variant="outline"
                  onClick={() => { setShowLinkForm(false); setSelectedStudentId(''); setLinkError('') }}
                  className="border-slate-700 text-slate-400"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {parent.students.length === 0 && !showLinkForm ? (
            <p className="text-slate-400 text-sm text-center py-4">No students linked yet.</p>
          ) : (
            <div className="space-y-2">
              {parent.students.map(student => (
                <div
                  key={student.linkId}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-700 bg-slate-800/50"
                >
                  <div>
                    <p className="text-white text-sm font-medium">{student.studentName}</p>
                    <p className="text-slate-500 text-xs capitalize">{student.relationship}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {student.is_primary && (
                      <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                        Primary
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUnlink(student.linkId)}
                      disabled={isPending}
                      className="text-slate-500 hover:text-red-400 h-7 w-7 p-0"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
