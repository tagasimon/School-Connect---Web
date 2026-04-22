'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateStudent } from '@/lib/actions/students'
import { searchParents } from '@/lib/actions/parents'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Save, Search, ShieldCheck, ShieldOff, UserMinus, UserCheck, X } from 'lucide-react'
import Link from 'next/link'

type ParentResult = { id: string; name: string; phone: string; email: string; hasAuthAccount: boolean }

interface Props {
  classId: string
  studentId: string
  schoolId: string
  student: Record<string, unknown>
  parent: { id: string; name: string; phone: string; relationship: string } | null
  allClasses: { id: string; name: string }[]
}

export default function EditStudentPage({ classId, studentId, schoolId, student, parent, allClasses }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [fullName, setFullName] = useState((student.full_name as string) || '')
  const [gender, setGender] = useState((student.gender as string) || '')
  const [dateOfBirth, setDateOfBirth] = useState((student.date_of_birth as string) || '')
  const [selectedClass, setSelectedClass] = useState((student.class_id as string) || classId)

  // Parent assignment state
  // undefined = no change; null = unlink; string = new parentId
  const [parentChange, setParentChange] = useState<{ parentId: string | null; relationship: string } | undefined>(undefined)

  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ParentResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [relationship, setRelationship] = useState(parent?.relationship || 'parent')

  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const currentParent = parentChange === undefined
    ? parent
    : parentChange === null
      ? null
      : null  // replaced — show pending card below

  const pendingParent: (ParentResult & { relationship: string }) | null =
    parentChange && parentChange.parentId
      ? { ...searchResults.find(r => r.id === parentChange.parentId)!, relationship: parentChange.relationship }
      : null

  const handleSearch = () => {
    if (!searchQuery.trim()) return
    setIsSearching(true)
    startTransition(async () => {
      const results = await searchParents(searchQuery.trim())
      setSearchResults(results)
      setIsSearching(false)
    })
  }

  const handleSelectParent = (p: ParentResult) => {
    setParentChange({ parentId: p.id, relationship })
    setShowSearch(false)
    setSearchQuery('')
    setSearchResults([])
  }

  const handleUnlink = () => {
    setParentChange({ parentId: null, relationship: '' })
    setShowSearch(false)
  }

  const handleCancelChange = () => {
    setParentChange(undefined)
    setRelationship(parent?.relationship || 'parent')
    setShowSearch(false)
    setSearchQuery('')
    setSearchResults([])
  }

  const handleSave = () => {
    if (!fullName.trim()) return
    setError(null)
    setSuccess(false)

    startTransition(async () => {
      try {
        await updateStudent(studentId, {
          fullName: fullName.trim(),
          gender,
          dateOfBirth: dateOfBirth || undefined,
          classId: selectedClass,
          ...(parentChange !== undefined && {
            parentId: parentChange.parentId,
            parentRelationship: parentChange.relationship || undefined,
          }),
        })
        setSuccess(true)
        setTimeout(() => router.push(`/school-admin/students/${selectedClass}`), 800)
      } catch {
        setError('Failed to save changes. Please try again.')
      }
    })
  }

  const effectiveRelationship = parentChange?.relationship ?? relationship

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild className="border-slate-700 text-slate-400 hover:text-white hover:border-amber-500">
          <Link href={`/school-admin/students/${classId}`}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-white">Edit Student</h1>
          <p className="text-slate-400 text-sm mt-1">{student.full_name as string}</p>
        </div>
      </div>

      {/* Student Details */}
      <Card className="bg-slate-900 border-slate-800 max-w-2xl">
        <CardHeader>
          <CardTitle className="text-white">Student Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-slate-300">Full Name</Label>
            <Input
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">Student Number</Label>
            <Input
              value={(student.student_number as string) || '—'}
              disabled
              className="bg-slate-800 border-slate-700 text-slate-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Gender</Label>
              <select
                value={gender}
                onChange={e => setGender(e.target.value)}
                className="w-full h-10 rounded-md bg-slate-800 border border-slate-700 text-white px-3 text-sm"
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Date of Birth</Label>
              <Input
                type="date"
                value={dateOfBirth}
                onChange={e => setDateOfBirth(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">Class</Label>
            <select
              value={selectedClass}
              onChange={e => setSelectedClass(e.target.value)}
              className="w-full h-10 rounded-md bg-slate-800 border border-slate-700 text-white px-3 text-sm"
            >
              {allClasses.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Parent / Guardian */}
      <Card className="bg-slate-900 border-slate-800 max-w-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white">Parent / Guardian</CardTitle>
          {parentChange !== undefined && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancelChange}
              className="text-slate-500 hover:text-white text-xs"
            >
              <X className="w-3 h-3 mr-1" />
              Cancel change
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Pending unlink */}
          {parentChange !== null && parentChange === undefined || (parentChange && parentChange.parentId === null) ? (
            parentChange?.parentId === null && (
              <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/5 text-sm text-red-400">
                Parent will be unlinked when you save.
              </div>
            )
          ) : null}

          {/* Pending new parent */}
          {pendingParent && (
            <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/5 space-y-1">
              <p className="text-xs text-amber-400 font-medium uppercase tracking-wide">New assignment (unsaved)</p>
              <p className="text-white font-medium">{pendingParent.name}</p>
              <p className="text-slate-400 text-sm">{pendingParent.email}</p>
              {pendingParent.phone && <p className="text-slate-500 text-xs">{pendingParent.phone}</p>}
              <div className="flex items-center gap-1.5 mt-1">
                {pendingParent.hasAuthAccount ? (
                  <span className="flex items-center gap-1 text-xs text-green-400">
                    <ShieldCheck className="w-3 h-3" /> Can Login
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-slate-500">
                    <ShieldOff className="w-3 h-3" /> No Login
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Current parent (no pending change) */}
          {parentChange === undefined && (
            currentParent ? (
              <div className="p-3 rounded-lg border border-slate-700 bg-slate-800/50 space-y-1">
                <p className="text-white font-medium">{currentParent.name}</p>
                <p className="text-slate-400 text-sm">{currentParent.phone}</p>
                <p className="text-slate-500 text-xs capitalize">{currentParent.relationship}</p>
                <div className="flex gap-2 mt-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSearch(true)}
                    className="border-slate-600 text-slate-400 hover:text-white hover:border-amber-500 text-xs"
                  >
                    <UserCheck className="w-3 h-3 mr-1" />
                    Change Parent
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleUnlink}
                    className="text-slate-500 hover:text-red-400 text-xs"
                  >
                    <UserMinus className="w-3 h-3 mr-1" />
                    Remove
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-start gap-3">
                <p className="text-slate-500 text-sm">No parent assigned.</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSearch(true)}
                  className="border-slate-600 text-slate-400 hover:text-white hover:border-amber-500 text-xs"
                >
                  <UserCheck className="w-3 h-3 mr-1" />
                  Assign Parent
                </Button>
              </div>
            )
          )}

          {/* Show assign button when pending is unlink */}
          {parentChange !== undefined && parentChange.parentId === null && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowSearch(true)}
              className="border-slate-600 text-slate-400 hover:text-white hover:border-amber-500 text-xs"
            >
              <UserCheck className="w-3 h-3 mr-1" />
              Assign a Different Parent
            </Button>
          )}

          {/* Show assign button when pending is new parent (allow changing again) */}
          {pendingParent && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowSearch(true)}
              className="border-slate-600 text-slate-400 hover:text-white hover:border-amber-500 text-xs"
            >
              <UserCheck className="w-3 h-3 mr-1" />
              Change Selection
            </Button>
          )}

          {/* Search panel */}
          {showSearch && (
            <div className="p-4 rounded-lg border border-slate-700 bg-slate-800/30 space-y-3">
              <p className="text-slate-300 text-sm font-medium">Search Parents</p>

              {/* Relationship */}
              <div className="space-y-1">
                <Label className="text-slate-400 text-xs">Relationship</Label>
                <select
                  value={effectiveRelationship}
                  onChange={e => {
                    setRelationship(e.target.value)
                    if (parentChange) setParentChange({ ...parentChange, relationship: e.target.value })
                  }}
                  className="w-full h-9 rounded-md bg-slate-800 border border-slate-700 text-white px-3 text-sm"
                >
                  <option value="parent">Parent</option>
                  <option value="guardian">Guardian</option>
                  <option value="sibling">Sibling</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Search input */}
              <div className="flex gap-2">
                <Input
                  type="email"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  placeholder="parent@example.com"
                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                />
                <Button
                  type="button"
                  onClick={handleSearch}
                  disabled={isSearching || !searchQuery.trim()}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold shrink-0"
                >
                  <Search className="w-4 h-4" />
                </Button>
              </div>

              {/* Results */}
              {searchResults.length > 0 && (
                <div className="space-y-1">
                  {searchResults.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectParent(p)}
                      className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-700 hover:border-amber-500 bg-slate-800/50 text-left transition-colors"
                    >
                      <div>
                        <p className="text-white text-sm font-medium">{p.name}</p>
                        <p className="text-slate-400 text-xs">{p.email}</p>
                        {p.phone && <p className="text-slate-500 text-xs">{p.phone}</p>}
                      </div>
                      {p.hasAuthAccount ? (
                        <span className="flex items-center gap-1 text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">
                          <ShieldCheck className="w-3 h-3" /> Can Login
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-slate-500 bg-slate-700/50 px-2 py-0.5 rounded-full">
                          <ShieldOff className="w-3 h-3" /> No Login
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {searchResults.length === 0 && searchQuery && !isSearching && (
                <p className="text-slate-500 text-sm">
                  No parent found for that email. <Link href="/school-admin/parents/add" className="text-amber-400 hover:underline">Create a parent first.</Link>
                </p>
              )}

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => { setShowSearch(false); setSearchQuery(''); setSearchResults([]) }}
                className="text-slate-500 hover:text-white text-xs"
              >
                Cancel
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {error && <p className="text-red-400 text-sm max-w-2xl">{error}</p>}
      {success && <p className="text-green-400 text-sm max-w-2xl">Changes saved. Redirecting...</p>}

      <div className="flex gap-3 max-w-2xl justify-end">
        <Button variant="outline" asChild className="border-slate-700 text-slate-400">
          <Link href={`/school-admin/students/${classId}`}>Cancel</Link>
        </Button>
        <Button
          onClick={handleSave}
          disabled={isPending || !fullName.trim()}
          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold"
        >
          <Save className="w-4 h-4 mr-2" />
          {isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  )
}
