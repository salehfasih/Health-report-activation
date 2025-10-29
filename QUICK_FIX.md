# Quick Fix: Database Migration Error

## The Issue
Error: `"Prisma session table does not exist"`

This means your database is connected, but the migrations haven't run yet.

## ✅ Fastest Fix (2 Minutes)

### Step 1: Connect to Your Database
Make sure you have your `DATABASE_URL` from Neon/Supabase/etc.

### Step 2: Run Migration Locally
```bash
# Add your DATABASE_URL to .env file first, then:
npx prisma migrate deploy
```

This will create the Session table in your production database immediately.

### Step 3: Test
Try your API endpoint again - it should work now!

---

## 🔄 Long-term Fix: Auto-run Migrations

To prevent this in the future, update Vercel's build command:

1. **Vercel Dashboard** → Your Project → **Settings** → **General**
2. Find **"Build Command"**
3. Change to:
   ```
   prisma generate && prisma migrate deploy && remix vite:build
   ```
4. **Save** and redeploy

Now migrations run automatically on every deploy! ✅

---

## 📋 What I Fixed

1. ✅ Updated migration SQL (changed `DATETIME` → `TIMESTAMP(3)` for PostgreSQL)
2. ✅ Updated `package.json` build script to include migrations
3. ✅ Created this quick fix guide

You can now either:
- **Quick**: Run `npx prisma migrate deploy` manually (works immediately)
- **Permanent**: Update Vercel build command (runs automatically)

