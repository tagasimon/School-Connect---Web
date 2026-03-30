'use client'

import { useState, useTransition, useEffect } from 'react'
import { createAnnouncement } from '@/lib/actions/announcements'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Megaphone, Plus, Send } from 'lucide-react'

interface ClassItem {
  id: string
  name: string
}

export default function AnnouncementsPage({
  schoolId,
  existingAnnouncements,
  classes,
}: {
  schoolId: string
  existingAnnouncements: Array<{
    id: string
    title: string
    body: string
    target: 'school' | 'class'
    sms_sent: boolean
    created_at: { _seconds: number; _nanoseconds: number }
    class_id?: string | null
  }>
  classes: ClassItem[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [target, setTarget] = useState<'school' | 'class'>('school')
  const [selectedClass, setSelectedClass] = useState('')
  const [smsEnabled, setSmsEnabled] = useState(false)

  const handleSubmit = () => {
    if (!title.trim() || !body.trim()) return

    startTransition(async () => {
      await createAnnouncement(schoolId, {
        title: title.trim(),
        body: body.trim(),
        target,
        classId: target === 'class' ? selectedClass : null,
        smsSent: smsEnabled,
      })
      setTitle('')
      setBody('')
      setTarget('school')
      setSelectedClass('')
      setSmsEnabled(false)
      setShowForm(false)
      router.refresh() // Refresh the page to show the new announcement
    })
  }

  const formatDate = (timestamp: { _seconds: number }) => {
    return new Date(timestamp._seconds * 1000).toLocaleDateString('en-UG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Announcements</h1>
          <p className="text-slate-400 text-sm mt-1">
            Create and manage school announcements
          </p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Announcement
        </Button>
      </div>

      {showForm && (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Create Announcement</CardTitle>
            <CardDescription>Share important information with parents and staff</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-slate-300">Title</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Sports Day Notice"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-slate-300">Message</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Enter the announcement details..."
                rows={4}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-slate-300">Audience</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    checked={target === 'school'}
                    onChange={() => setTarget('school')}
                    className="text-amber-500 focus:ring-amber-500"
                  />
                  Entire School
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    checked={target === 'class'}
                    onChange={() => setTarget('class')}
                    className="text-amber-500 focus:ring-amber-500"
                  />
                  Specific Class
                </label>
              </div>

              {target === 'class' && (
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="mt-2 w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">Select a class</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="sms"
                checked={smsEnabled}
                onChange={(e) => setSmsEnabled(e.target.checked)}
                className="rounded border-slate-700 text-amber-500 focus:ring-amber-500"
              />
              <label htmlFor="sms" className="text-sm text-slate-300 flex items-center gap-1">
                <Send className="w-3 h-3" />
                Send via SMS to parents (charged)
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowForm(false)}
                className="border-slate-700 text-slate-400"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isPending || !title.trim() || !body.trim()}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold"
              >
                {isPending ? 'Posting...' : 'Post Announcement'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {existingAnnouncements.length === 0 ? (
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="py-12 text-center">
              <Megaphone className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">No announcements yet</p>
              <p className="text-slate-500 text-sm mt-1">
                Create your first announcement to share information
              </p>
            </CardContent>
          </Card>
        ) : (
          existingAnnouncements.map((announcement) => (
            <Card key={announcement.id} className="bg-slate-900 border-slate-800">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-white flex items-center gap-2">
                    <Megaphone className="w-4 h-4 text-amber-400" />
                    {announcement.title}
                  </CardTitle>
                  <span className="text-xs text-slate-500">
                    {formatDate(announcement.created_at)}
                  </span>
                </div>
                <CardDescription className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-xs ${
                      announcement.target === 'school'
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-purple-500/20 text-purple-400'
                    }`}
                  >
                    {announcement.target === 'school' ? 'School-wide' : 'Specific Class'}
                  </span>
                  {announcement.sms_sent && (
                    <span className="px-2 py-0.5 rounded text-xs bg-amber-500/20 text-amber-400 flex items-center gap-1">
                      <Send className="w-3 h-3" />
                      SMS sent
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-slate-300 whitespace-pre-wrap">{announcement.body}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
