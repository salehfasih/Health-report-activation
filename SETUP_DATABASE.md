# Database Setup Instructions

## Step 1: Create Neon Database

1. Go to https://neon.tech and sign up (free)
2. Click "Create Project"
3. Choose a name (e.g., "health-report-activation")
4. Select region closest to you
5. Click "Create Project"

## Step 2: Get Connection String

1. In your Neon project, click "Connection Details"
2. Copy the connection string (looks like):
   ```
   postgresql://username:password@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require
   ```

## Step 3: Update Environment Variables

### Local Development

Create/update `.env` file:
```env
DATABASE_URL="postgresql://username:password@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require"
```

### Vercel Production

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add new variable:
   - **Key**: `DATABASE_URL`
   - **Value**: (paste your Neon connection string)
   - **Environment**: Production, Preview, Development (select all)
3. Click "Save"

## Step 4: Run Database Migrations

### Local:
```bash
npx prisma generate
npx prisma migrate deploy
```

### On Vercel:
The migrations will run automatically when you deploy, OR run manually:
```bash
vercel env pull .env.local
npx prisma migrate deploy
```

Or add to your Vercel build command:
```json
{
  "buildCommand": "prisma generate && prisma migrate deploy && remix vite:build"
}
```

## Alternative: Other Database Options

### Supabase (PostgreSQL)
- Free: 500 MB storage
- Setup: https://supabase.com
- Good alternative with extra features

### Railway (PostgreSQL)
- $5/month free credit
- Very simple setup
- Setup: https://railway.app

### Vercel Postgres
- Native Vercel integration
- Setup: Vercel Dashboard → Storage → Postgres
- Paid only (pay-as-you-go)

### PlanetScale (MySQL)
- Free: 1 GB storage
- Note: Requires slightly different Prisma setup
- Good if you prefer MySQL

## Why Neon?

✅ **Best for Vercel**: Serverless architecture matches perfectly  
✅ **Free tier**: 0.5 GB is plenty for session storage  
✅ **No cold starts**: Always warm connections  
✅ **Easy setup**: 5 minutes from signup to running  
✅ **Auto-scaling**: Grows with your app  

