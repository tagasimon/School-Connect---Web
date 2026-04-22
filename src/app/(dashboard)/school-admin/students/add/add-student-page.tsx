'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { addStudentWithParent } from '@/lib/actions/students'
import { searchParentByPhone } from '@/lib/actions/parents'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ArrowLeft, CheckCircle, User, Users, DollarSign, Search } from 'lucide-react'
import Link from 'next/link'

export default function AddStudentPage({
  schoolId,
  classes,
  commitmentTypes,
}: {
  schoolId: string
  classes: Array<{ id: string; name: string }>
  commitmentTypes: Array<{ id: string; name: string; default_amount: number }>
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedClass = searchParams.get('class') || ''

  const [isPending, startTransition] = useTransition()
  const [step, setStep] = useState(1)
  const [selectedClass, setSelectedClass] = useState(preselectedClass)
  const [fullName, setFullName] = useState('')
  const [studentNumber, setStudentNumber] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [gender, setGender] = useState('male')

  // Parent state
  const [parentMode, setParentMode] = useState<'new' | 'existing'>('new')
  const [parentName, setParentName] = useState('')
  const [parentPhone, setParentPhone] = useState('')
  const [parentPassword, setParentPassword] = useState('')
  const [parentRelationship, setParentRelationship] = useState('parent')
  // Existing parent search
  const [searchPhone, setSearchPhone] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [foundParent, setFoundParent] = useState<{ id: string; name: string; phone: string } | null>(null)
  const [searchError, setSearchError] = useState('')

  const [selectedCommitments, setSelectedCommitments] = useState<Set<string>>(new Set())

  const toggleCommitment = (id: string) => {
    setSelectedCommitments(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const totalCommitments = commitmentTypes
    .filter(ct => selectedCommitments.has(ct.id))
    .reduce((sum, ct) => sum + ct.default_amount, 0)

  const handleSearchParent = async () => {
    if (!searchPhone) return
    setIsSearching(true)
    setSearchError('')
    setFoundParent(null)
    const result = await searchParentByPhone(searchPhone)
    if (result) {
      setFoundParent(result)
    } else {
      setSearchError('No parent found with this phone number. Create a new parent instead.')
    }
    setIsSearching(false)
  }

  const parentStepValid = parentMode === 'existing'
    ? !!foundParent
    : !!(parentName && parentPhone && parentPassword)

  const handleSubmit = () => {
    if (!selectedClass || !fullName || !dateOfBirth) return
    if (!parentStepValid) return

    startTransition(async () => {
      const result = await addStudentWithParent(schoolId, {
        fullName,
        studentNumber: studentNumber || undefined,
        dateOfBirth,
        gender: gender as 'male' | 'female' | 'other',
        classId: selectedClass,
        parentId: parentMode === 'existing' ? foundParent!.id : undefined,
        parentName: parentMode === 'new' ? parentName : undefined,
        parentPhone: parentMode === 'new' ? parentPhone : undefined,
        parentPassword: parentMode === 'new' ? parentPassword : undefined,
        parentRelationship,
        commitmentIds: Array.from(selectedCommitments),
      })

      if (result.success) {
        router.push(`/school-admin/students/${selectedClass}`)
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
          <Link href="/school-admin/students">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-white">Add Student</h1>
          <p className="text-slate-400 text-sm mt-1">Step {step} of 3</p>
        </div>
      </div>

      {/* Step Indicators */}
      <div className="flex items-center gap-2">
        {[
          { n: 1, label: 'Student Details', icon: User },
          { n: 2, label: 'Parent / Guardian', icon: Users },
          { n: 3, label: 'Fee Commitments', icon: DollarSign },
        ].map((s, i) => (
          <div key={s.n} className="flex items-center flex-1">
            <div
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm w-full ${
                step === s.n
                  ? 'bg-amber-500/20 text-amber-400'
                  : step > s.n
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-slate-800 text-slate-500'
              }`}
            >
              <s.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{s.label}</span>
              <span className="sm:hidden">{s.n}</span>
            </div>
            {i < 2 && <div className="w-4 h-px bg-slate-700 shrink-0" />}
          </div>
        ))}
      </div>

      {/* Step 1: Student Details */}
      {step === 1 && (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Student Details</CardTitle>
            <CardDescription className="text-slate-400">Enter the student's personal information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-slate-300">Class *</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">Select a class</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>{cls.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-slate-300">Full Name *</label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g., Brian Ssekandi"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-slate-300">Student Number (optional)</label>
                <Input
                  value={studentNumber}
                  onChange={(e) => setStudentNumber(e.target.value)}
                  placeholder="e.g., P3A/001"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-slate-300">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-slate-300">Date of Birth *</label>
              <Input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>

            <div className="flex justify-end">
              <Button
                onClick={() => setStep(2)}
                disabled={!selectedClass || !fullName || !dateOfBirth}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold"
              >
                Next: Parent Info
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Parent Info */}
      {step === 2 && (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Parent / Guardian</CardTitle>
            <CardDescription className="text-slate-400">Link this student to a parent account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Mode toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => { setParentMode('new'); setFoundParent(null); setSearchError('') }}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium border transition-colors ${
                  parentMode === 'new'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                }`}
              >
                New Parent
              </button>
              <button
                onClick={() => { setParentMode('existing'); setParentName(''); setParentPhone(''); setParentPassword('') }}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium border transition-colors ${
                  parentMode === 'existing'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                }`}
              >
                Existing Parent
              </button>
            </div>

            {parentMode === 'new' && (
              <>
                <div className="space-y-2">
                  <label className="text-sm text-slate-300">Parent Name *</label>
                  <Input
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                    placeholder="e.g., James Kalule"
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-slate-300">Phone Number *</label>
                  <Input
                    value={parentPhone}
                    onChange={(e) => setParentPhone(e.target.value)}
                    placeholder="e.g., +256701000001"
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                  <p className="text-xs text-slate-500">Used for SMS notifications and mobile app login</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-slate-300">App Password *</label>
                  <Input
                    type="password"
                    value={parentPassword}
                    onChange={(e) => setParentPassword(e.target.value)}
                    placeholder="Set a password for the parent's mobile app"
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                  <p className="text-xs text-slate-500">Share this with the parent so they can log in to the SchoolConnect app</p>
                </div>
              </>
            )}

            {parentMode === 'existing' && (
              <>
                <div className="space-y-2">
                  <label className="text-sm text-slate-300">Search by Phone Number</label>
                  <div className="flex gap-2">
                    <Input
                      value={searchPhone}
                      onChange={(e) => { setSearchPhone(e.target.value); setFoundParent(null); setSearchError('') }}
                      placeholder="e.g., +256701000001"
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                    <Button
                      onClick={handleSearchParent}
                      disabled={!searchPhone || isSearching}
                      variant="outline"
                      className="border-slate-700 text-slate-300 hover:border-amber-500 hover:text-white shrink-0"
                    >
                      <Search className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {searchError && (
                  <p className="text-sm text-red-400">{searchError}</p>
                )}

                {foundParent && (
                  <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                    <p className="text-green-400 text-sm font-medium">{foundParent.name}</p>
                    <p className="text-green-400/70 text-xs">{foundParent.phone}</p>
                  </div>
                )}
              </>
            )}

            <div className="space-y-2">
              <label className="text-sm text-slate-300">Relationship</label>
              <select
                value={parentRelationship}
                onChange={(e) => setParentRelationship(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="parent">Parent</option>
                <option value="guardian">Guardian</option>
                <option value="sibling">Sibling</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)} className="border-slate-700 text-slate-400">
                Back
              </Button>
              <Button
                onClick={() => setStep(3)}
                disabled={!parentStepValid}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold"
              >
                Next: Fee Commitments
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Fee Commitments */}
      {step === 3 && (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Additional Fee Commitments</CardTitle>
            <CardDescription className="text-slate-400">
              Select extra services that add to the student&apos;s total fees
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {commitmentTypes.length === 0 ? (
              <p className="text-slate-400 text-center py-4">
                No additional fee services configured. The base class fee will apply.
              </p>
            ) : (
              <div className="space-y-2">
                {commitmentTypes.map(ct => (
                  <label
                    key={ct.id}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedCommitments.has(ct.id)
                        ? 'border-amber-500 bg-amber-500/10'
                        : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedCommitments.has(ct.id)}
                        onChange={() => toggleCommitment(ct.id)}
                        className="w-4 h-4 accent-amber-500"
                      />
                      <span className="text-white">{ct.name}</span>
                    </div>
                    <span className="text-amber-400 font-medium">
                      +UGX {ct.default_amount.toLocaleString()}
                    </span>
                  </label>
                ))}
              </div>
            )}

            {totalCommitments > 0 && (
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <p className="text-green-400 text-sm">
                  Additional commitments: <strong>UGX {totalCommitments.toLocaleString()}</strong>
                  <br />
                  <span className="text-xs">This will be added to the base class fee</span>
                </p>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)} className="border-slate-700 text-slate-400">
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isPending}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold"
              >
                {isPending ? (
                  'Creating...'
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Create Student
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
