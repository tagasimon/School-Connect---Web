import { getApps, initializeApp, cert, type App } from 'firebase-admin/app'
import { getFirestore, Firestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'

let cachedDb: Firestore | null = null

/**
 * Lazily initialises the Firebase Admin app so that the SDK is never
 * instantiated at module-load time (which happens during `next build` before
 * env vars are available).  Call adminDb() / adminAuth() at the start of each
 * server function instead of using them as direct module-level references.
 */
function getApp(): App {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY!
    // Remove surrounding quotes if present
    .replace(/^"|"$/g, '')
    // Replace escaped newlines with actual newlines
    .replace(/\\n/g, '\n')
    // Ensure proper line endings
    .trim()

  return (
    getApps()[0] ??
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID!,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
        privateKey,
      }),
    })
  )
}

export const adminDb = (): Firestore => {
  if (!cachedDb) {
    cachedDb = getFirestore(getApp())
    // Force use of REST API instead of gRPC to avoid Node.js 22 compatibility issues
    // Wrap in try/catch to handle HMR reloads where Firestore may already be initialized
    try {
      cachedDb.settings({ preferRest: true })
    } catch (e) {
      // Ignore if already initialized
    }
  }
  return cachedDb
}

export const adminAuth = () => getAuth(getApp())
