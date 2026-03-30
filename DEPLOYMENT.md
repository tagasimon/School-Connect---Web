# SchoolConnect Web Platform - Vercel Deployment Guide

## Quick Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-org/school-mgt-platform&project-name=schoolconnect-web&repository-name=schoolconnect-web&root-directory=web)

## Prerequisites

1. **Firebase Project** - Already set up at `schoolconnect-49cb6`
2. **Supabase Project** - Database schema in `web/supabase/schema.sql`
3. **Africa's Talking Account** - For SMS notifications
4. **Vercel Account** - For hosting

## Environment Variables

Set these in Vercel project settings (Settings → Environment Variables):

### Firebase (Required)
| Variable | Description | Where to Find |
|----------|-------------|---------------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Web API Key | Firebase Console → Project Settings → General |
| `FIREBASE_PROJECT_ID` | Firebase Project ID | Firebase Console → Project Settings → General |
| `FIREBASE_CLIENT_EMAIL` | Service Account Email | Firebase Console → Project Settings → Service Accounts |
| `FIREBASE_PRIVATE_KEY` | Service Account Private Key | Firebase Console → Project Settings → Service Accounts |

### Supabase (Required)
| Variable | Description | Where to Find |
|----------|-------------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anon Key | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key | Supabase Dashboard → Settings → API |

### Africa's Talking (Optional for SMS)
| Variable | Description | Where to Find |
|----------|-------------|---------------|
| `AT_API_KEY` | Africa's Talking API Key | Africa's Talking Dashboard → API Keys |
| `AT_USERNAME` | AT Username (use `sandbox` for dev) | Africa's Talking Dashboard |
| `AT_SENDER_ID` | SMS Sender ID | Africa's Talking Dashboard |

## Step-by-Step Deployment

### 1. Push to GitHub

```bash
cd /Users/kazoobasimon/Code/school-mgt-platform/web
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

### 2. Connect to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repository
4. Set **Root Directory** to `web`
5. Click "Deploy"

### 3. Configure Environment Variables

In Vercel Dashboard → Settings → Environment Variables, add all variables from the table above.

**Important:** For `FIREBASE_PRIVATE_KEY`, paste the entire key including:
```
-----BEGIN PRIVATE KEY-----
MIIEv...
-----END PRIVATE KEY-----
```

Replace `\n` with actual newlines when pasting.

### 4. Redeploy

After adding environment variables, trigger a new deployment:
- Go to Deployments tab
- Click "Redeploy" on the latest deployment

## Build Settings

Vercel auto-detects Next.js. Configuration:

- **Framework Preset:** Next.js
- **Build Command:** `npm run build`
- **Output Directory:** `.next`
- **Install Command:** `npm install`

## Post-Deployment Checklist

- [ ] Test login with all user roles (super_admin, school_admin, teacher, accountant, parent)
- [ ] Verify Firestore database connection
- [ ] Test creating a new school from super-admin
- [ ] Test adding school admin
- [ ] Verify SMS sending (if AT credentials configured)
- [ ] Check all dashboard pages load correctly

## Domain Configuration

1. Go to Vercel Project → Settings → Domains
2. Add your custom domain (e.g., `schoolconnect.ug`)
3. Update DNS records as instructed
4. Wait for SSL certificate (automatic)

## Monitoring

- **Vercel Analytics:** Enable in Project Settings → Analytics
- **Error Tracking:** Check Deployments → Click deployment → Functions logs
- **Performance:** Use Vercel Speed Insights

## Rollback

If something goes wrong:
1. Go to Deployments tab
2. Find last working deployment
3. Click "Promote to Production"

## Local Testing Before Deploy

```bash
cd web
npm run build
npm run start
```

This tests the production build locally.

## Troubleshooting

### Build Fails
- Check build logs in Vercel dashboard
- Verify all environment variables are set
- Run `npm run build` locally to reproduce

### Runtime Errors
- Check Function Logs in Vercel
- Verify Firebase credentials
- Check Firestore rules in Firebase Console

### 404 on Pages
- Ensure all dynamic routes use correct params structure
- Check Next.js 16 compatibility (await params)

## Support

For issues:
1. Check Vercel Function Logs
2. Review Firebase Console for auth/database errors
3. Verify Supabase RLS policies

---

**Deployed Successfully?** 🎉

Share the Vercel URL with your team for testing!
