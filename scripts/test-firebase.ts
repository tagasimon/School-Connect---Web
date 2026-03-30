/**
 * Simple test to verify Firebase Admin connection
 */

import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })

console.log('Environment check:')
console.log('  FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID)
console.log('  FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL)
console.log('  FIREBASE_PRIVATE_KEY length:', process.env.FIREBASE_PRIVATE_KEY?.length)
console.log('  FIREBASE_PRIVATE_KEY starts with:', process.env.FIREBASE_PRIVATE_KEY?.substring(0, 27))

import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'

const privateKey = process.env.FIREBASE_PRIVATE_KEY!
  .replace(/^"|"$/g, '')
  .replace(/\\n/g, '\n')
  .trim()

console.log('\nPrivate key after processing:')
console.log('  Length:', privateKey.length)
console.log('  Starts with:', privateKey.substring(0, 27))
console.log('  Ends with:', privateKey.substring(privateKey.length - 25))

try {
  const app = getApps()[0] ?? initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      privateKey,
    }),
  })

  console.log('\n✅ Firebase Admin initialized successfully')

  const db = getFirestore(app)
  console.log('✅ Firestore client created')

  const auth = getAuth(app)
  console.log('✅ Firebase Auth client created')

  // Try a simple operation
  console.log('\nTesting Firestore connection...')
  const schoolsRef = db.collection('schools')
  console.log('✅ Firestore collection reference created')

  process.exit(0)
} catch (error) {
  console.error('\n❌ Error:', error)
  process.exit(1)
}
