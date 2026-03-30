'use server'

import { adminAuth } from '@/lib/firebase/admin'
import { getCurrentProfile } from '@/lib/firebase/queries'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export type LoginState = { error: string } | null

const ROLE_REDIRECTS: Record<string, string> = {
  super_admin: '/super-admin',
  school_admin: '/school-admin',
  teacher: '/teacher',
  accountant: '/accountant',
  parent: '/parent', // Parents use mobile app only, but we'll show a message page
}

// 5 days in milliseconds
const SESSION_TTL_MS = 60 * 60 * 24 * 5 * 1000

export async function login(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  // Sign in via Firebase Auth REST API (server-side, no client SDK needed)
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.NEXT_PUBLIC_FIREBASE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  )

  if (!res.ok) {
    const body = await res.json() as { error?: { message?: string } }
    const code = body.error?.message ?? ''
    const message =
      code === 'INVALID_LOGIN_CREDENTIALS' || code === 'EMAIL_NOT_FOUND' || code === 'INVALID_PASSWORD'
        ? 'Invalid email or password'
        : code || 'Sign in failed'
    return { error: message }
  }

  const { idToken, localId: uid } = await res.json() as { idToken: string; localId: string }

  // Exchange the short-lived ID token for a long-lived session cookie
  const sessionCookie = await adminAuth().createSessionCookie(idToken, {
    expiresIn: SESSION_TTL_MS,
  })

  const cookieStore = await cookies()
  cookieStore.set('session', sessionCookie, {
    maxAge: SESSION_TTL_MS / 1000,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  })

  const profile = await getCurrentProfile(uid)
  const destination = profile?.role
    ? (ROLE_REDIRECTS[profile.role] ?? '/school-admin')
    : '/school-admin'
  redirect(destination)
}

export async function logout() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')?.value

  if (sessionCookie) {
    try {
      const decoded = await adminAuth().verifySessionCookie(sessionCookie)
      // Revoke all refresh tokens for this user so the session can't be reused
      await adminAuth().revokeRefreshTokens(decoded.uid)
    } catch {
      // Cookie already invalid — proceed
    }
    cookieStore.delete('session')
  }

  redirect('/login')
}

export async function getProfile() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')?.value
  if (!sessionCookie) return null

  try {
    const decoded = await adminAuth().verifySessionCookie(sessionCookie, true)
    return getCurrentProfile(decoded.uid)
  } catch {
    return null
  }
}
