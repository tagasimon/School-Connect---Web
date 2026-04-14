import { adminAuth } from '@/lib/firebase/admin'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/login']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p))

  const sessionCookie = request.cookies.get('session')?.value

  if (!sessionCookie) {
    if (!isPublic) return NextResponse.redirect(new URL('/login', request.url))
    return NextResponse.next()
  }

  try {
    // Optimistic check — verify JWT signature only, no revocation network call.
    // Full revocation check (checkRevoked: true) happens inside each page/action.
    const decodedClaims = await adminAuth().verifySessionCookie(sessionCookie, false)
    // Valid session on a public page → send to home (which will redirect to role dashboard)
    if (isPublic) return NextResponse.redirect(new URL('/', request.url))
    return NextResponse.next()
  } catch {
    // Expired or revoked — clear the cookie and redirect to login
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete('session')
    return response
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
