import { cookies } from 'next/headers'
import { adminAuth } from './admin'

/**
 * Reads the httpOnly `session` cookie and verifies it with Firebase Admin.
 * Returns the Firebase UID on success, or null if the cookie is missing/invalid.
 */
export async function getSessionUid(): Promise<string | null> {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')?.value
  if (!sessionCookie) return null

  try {
    const decoded = await adminAuth().verifySessionCookie(sessionCookie, true)
    return decoded.uid
  } catch {
    return null
  }
}
