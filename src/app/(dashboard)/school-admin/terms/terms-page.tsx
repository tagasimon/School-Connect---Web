'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createTerm, setCurrentTerm, updateTerm, deleteTerm } from '@/lib/actions/terms'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Plus, Calendar, Pencil, Trash2, CheckCircle } from 'lucide-react'

interface Term {
  id: string
  name: string
  year: number
  start_date: string
  end_date: string
  is_current: boolean
}

export default function TermsPage({
  terms: initialTerms,
  schoolId,
}: {
  terms: Term[]
  schoolId: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ name: 'Term 1', year: new Date().getFullYear(), startDate: '', endDate: '' })
  const [editData, setEditData] = useState<{ name: string; startDate: string; endDate: string }>({ name: '', startDate: '', endDate: '' })
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const [terms, setTerms] = useState(initialTerms)

  // Group terms by year
  const termsByYear: Record<number, Term[]> = {}
  terms.forEach(term => {
    if (!termsByYear[term.year]) termsByYear[term.year] = []
    termsByYear[term.year].push(term)
  })
  const sortedYears = Object.keys(termsByYear).map(Number).sort((a, b) => b - a)

  const formatDate = (iso: string) => {
    if (!iso) return '—'
    const d = new Date(iso)
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const handleCreate = () => {
    if (!formData.name || !formData.startDate || !formData.endDate) return

    setError(null)
    setSuccessMsg(null)
    startTransition(async () => {
      const result = await createTerm(schoolId, {
        name: formData.name,
        year: formData.year,
        startDate: formData.startDate,
        endDate: formData.endDate,
      })

      if (result.error) {
        setError(result.error)
      } else {
        setSuccessMsg('Term created successfully.')
        setShowForm(false)
        setFormData({ name: 'Term 1', year: new Date().getFullYear(), startDate: '', endDate: '' })
        router.refresh()
      }
    })
  }

  const handleSetCurrent = (termId: string) => {
    startTransition(async () => {
      await setCurrentTerm(schoolId, termId)
      router.refresh()
    })
  }

  const handleEditStart = (term: Term) => {
    setEditingId(term.id)
    setEditData({ name: term.name, startDate: term.start_date || '', endDate: term.end_date || '' })
  }

  const handleEditSave = () => {
    if (!editData.name || !editData.startDate || !editData.endDate) return

    setError(null)
    setSuccessMsg(null)
    startTransition(async () => {
      const result = await updateTerm(editingId!, {
        name: editData.name,
        startDate: editData.startDate,
        endDate: editData.endDate,
      })

      if (result.error) {
        setError(result.error)
      } else {
        setSuccessMsg('Term updated successfully.')
        setEditingId(null)
        router.refresh()
      }
    })
  }

  const handleDelete = (termId: string, termName: string) => {
    if (!confirm(`Delete "${termName}"? This cannot be undone.`)) return

    setError(null)
    setSuccessMsg(null)
    startTransition(async () => {
      const result = await deleteTerm(termId, schoolId)
      if (result.error) {
        setError(result.error)
      } else {
        setSuccessMsg('Term deleted successfully.')
        setTerms(prev => prev.filter(t => t.id !== termId))
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Academic Terms</h1>
          <p className="text-slate-400 text-sm mt-1">Manage terms for your school year</p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Term
        </Button>
      </div>

      {error && (
        <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">{error}</p>
      )}
      {successMsg && (
        <p className="text-green-400 text-sm bg-green-500/10 border border-green-500/20 rounded-lg px-4 py-2">{successMsg}</p>
      )}

      {/* Add Term Form */}
      {showForm && (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">New Academic Term</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-slate-300">Term Name</label>
                <select
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="Term 1">Term 1</option>
                  <option value="Term 2">Term 2</option>
                  <option value="Term 3">Term 3</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-slate-300">Year</label>
                <Input
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-slate-300">Start Date</label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-slate-300">End Date</label>
                <Input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowForm(false)}
                className="border-slate-700 text-slate-400"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={isPending || !formData.name || !formData.startDate || !formData.endDate}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold"
              >
                {isPending ? (
                  <>
                    <span className="h-4 w-4 rounded-full border-2 border-slate-950 border-r-transparent animate-spin inline-block mr-2" />
                    Creating...
                  </>
                ) : (
                  'Create Term'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Terms grouped by year */}
      {sortedYears.length === 0 ? (
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="text-center py-12">
            <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 text-lg">No academic terms created yet.</p>
            <p className="text-slate-500 text-sm mt-1">Add your first term to get started.</p>
          </CardContent>
        </Card>
      ) : (
        sortedYears.map(year => (
          <Card key={year} className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">{year} Academic Year</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {termsByYear[year].map(term => (
                  <div
                    key={term.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border border-slate-700 bg-slate-800/50 gap-3"
                  >
                    {editingId === term.id ? (
                      /* Inline edit form */
                      <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3 w-full">
                        <div className="space-y-1 flex-1">
                          <label className="text-xs text-slate-400">Term Name</label>
                          <Input
                            value={editData.name}
                            onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                            className="bg-slate-800 border-slate-700 text-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-slate-400">Start</label>
                          <Input
                            type="date"
                            value={editData.startDate}
                            onChange={(e) => setEditData(prev => ({ ...prev, startDate: e.target.value }))}
                            className="bg-slate-800 border-slate-700 text-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-slate-400">End</label>
                          <Input
                            type="date"
                            value={editData.endDate}
                            onChange={(e) => setEditData(prev => ({ ...prev, endDate: e.target.value }))}
                            className="bg-slate-800 border-slate-700 text-white"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={handleEditSave}
                            disabled={isPending}
                            size="sm"
                            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold"
                          >
                            Save
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setEditingId(null)}
                            size="sm"
                            className="border-slate-700 text-slate-400"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      /* Term display */
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-amber-400" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-white font-medium">{term.name}</p>
                              {term.is_current && (
                                <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-500/20 text-amber-400">
                                  CURRENT
                                </span>
                              )}
                            </div>
                            <p className="text-slate-400 text-sm">
                              {formatDate(term.start_date)} → {formatDate(term.end_date)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {!term.is_current && (
                            <Button
                              onClick={() => handleSetCurrent(term.id)}
                              disabled={isPending}
                              size="sm"
                              variant="outline"
                              className="border-green-500/30 text-green-400 hover:bg-green-500/10"
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Set Current
                            </Button>
                          )}
                          <Button
                            onClick={() => handleEditStart(term)}
                            size="sm"
                            variant="ghost"
                            className="text-slate-400 hover:text-white"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() => handleDelete(term.id, term.name)}
                            disabled={isPending}
                            size="sm"
                            variant="ghost"
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
