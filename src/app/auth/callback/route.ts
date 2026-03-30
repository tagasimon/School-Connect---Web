import { NextResponse } from 'next/server'

// OAuth callback is not used with Firebase email/password auth.
// Redirect any stray hits back to the login page.
export async function GET(request: Request) {
  const { origin } = new URL(request.url)
  return NextResponse.redirect(`${origin}/login`)
}
