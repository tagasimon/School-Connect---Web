import { redirect } from 'next/navigation'
import { getSessionUid } from '@/lib/firebase/session'
import { getCurrentProfile } from '@/lib/firebase/queries'
import { getAnnouncements, getClassesForSchool } from '@/lib/actions/announcements'
import AnnouncementsPage from './announcements-page'

export default async function TeacherAnnouncementsPage() {
  const uid = await getSessionUid()
  if (!uid) redirect('/login')

  const profile = await getCurrentProfile(uid)
  if (!profile?.school_id) redirect('/login')

  const [announcements, classes] = await Promise.all([
    getAnnouncements(profile.school_id),
    getClassesForSchool(profile.school_id),
  ])

  return (
    <AnnouncementsPage
      schoolId={profile.school_id}
      existingAnnouncements={announcements}
      classes={classes}
    />
  )
}
