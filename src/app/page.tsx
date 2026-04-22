import { getProfile } from '@/lib/actions/auth'
import { redirect } from 'next/navigation'

const ROLE_REDIRECTS: Record<string, string> = {
  super_admin: '/super-admin',
  school_admin: '/school-admin',
  teacher: '/teacher',
  accountant: '/accountant',
  parent: '/parent',
}

export default async function RootPage() {
  const profile = await getProfile()

  if (!profile) {
    redirect('/login')
  }

  const destination = ROLE_REDIRECTS[profile.role] ?? '/school-admin'
  redirect(destination)
}
