# Fix Database Migration Issue

## Problem
The Prisma session table doesn't exist in your PostgreSQL database because:
1. The migration was created for SQLite (using `DATETIME`)
2. Migrations haven't been run on your production database

## Solution: Run Migrations

### Option 1: Automatic (Recommended)
Update Vercel to run migrations automatically during build:

1. **Go to Vercel Dashboard**
   - Your Project → Settings → General
   - Scroll to "Build & Development Settings"

2. **Update Build Command:**
   ```
   prisma generate && prisma migrate deploy && remix vite:build
   ```

3. **Redeploy** - Migrations will run automatically

### Option 2: Manual (Quick Fix)

Run migrations manually right now:

#### If you have Vercel CLI installed:
```bash
vercel env pull .env.local
npx prisma migrate deploy
```

#### Or connect directly to your database:
```bash
# Set DATABASE_URL in your local .env file with your Neon connection string
npx prisma migrate deploy
```

### Option 3: SQL Script (Emergency)

If migrations fail, run this SQL directly in your database:

```sql
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" TIMESTAMP(3),
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN DEFAULT false,
    "emailVerified" BOOLEAN DEFAULT false
);
```

Then mark migration as applied:
```bash
npx prisma migrate resolve --applied 20240530213853_create_session_table
```

## Quick Steps (Recommended)

1. **Verify DATABASE_URL is set in Vercel**
   - Settings → Environment Variables
   - Should have: `DATABASE_URL=postgresql://...`

2. **Update Build Command in Vercel**
   - Settings → General → Build Command
   - Change to: `prisma generate && prisma migrate deploy && remix vite:build`

3. **Redeploy**
   - Deployments → Redeploy latest
   - Or push a commit

The migration will run automatically and create the Session table!

