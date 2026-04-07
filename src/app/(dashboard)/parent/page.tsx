import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Smartphone, ArrowLeft, LogOut } from 'lucide-react'
import { logout } from '@/lib/actions/auth'
import Link from 'next/link'

export default function ParentLandingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Brand */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-amber-500 text-slate-950 font-bold text-xl">
            SC
          </div>
          <h1 className="text-2xl font-bold text-white">SchoolConnect</h1>
        </div>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-4 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10">
              <Smartphone className="h-8 w-8 text-amber-500" />
            </div>
            <CardTitle className="text-white text-xl">Parent Access</CardTitle>
            <CardDescription className="text-slate-400">
              Parents access SchoolConnect via the mobile app
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-slate-800 p-4 text-sm text-slate-300 space-y-2">
              <p className="font-medium text-white">Download the SchoolConnect app:</p>
              <ul className="list-disc list-inside space-y-1 text-slate-400">
                <li>View your child&apos;s attendance</li>
                <li>Check results and reports</li>
                <li>Track fees and payments</li>
                <li>Receive school announcements</li>
              </ul>
            </div>

            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-4 text-sm text-amber-400">
              <p className="font-medium">Available on Google Play Store</p>
              <p className="text-slate-400 mt-1">
                Search &ldquo;SchoolConnect&rdquo; on your Android device
              </p>
            </div>

            <div className="flex gap-3">
              <form action={logout} className="flex-1">
                <Button type="submit" variant="outline" className="w-full border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </Button>
              </form>
              <Button asChild className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold">
                <Link href="/login">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Sign In
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-slate-600">
          SchoolConnect · Elastic Technologies Ltd · Uganda
        </p>
      </div>
    </div>
  )
}
