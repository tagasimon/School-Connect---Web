import { redirect } from 'next/navigation'
import { getSessionUid } from '@/lib/firebase/session'
import { getCurrentProfile } from '@/lib/firebase/queries'

const ROLE_REDIRECTS: Record<string, string> = {
  super_admin: '/super-admin',
  school_admin: '/school-admin',
  teacher: '/teacher',
  accountant: '/accountant',
  parent: '/parent', // Parents use mobile app only
}

export default async function RootPage() {
  const uid = await getSessionUid()
  if (!uid) redirect('/login')

  const profile = await getCurrentProfile(uid)
  const destination = profile?.role ? (ROLE_REDIRECTS[profile.role] ?? '/login') : '/login'
  redirect(destination)
}
