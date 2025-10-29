# Database Setup Guide

## Recommended: Neon (PostgreSQL) - Best for Vercel

### Why Neon?
- ✅ Serverless PostgreSQL (auto-scales, works perfectly with Vercel)
- ✅ Free tier: 3 projects, 0.5 GB storage
- ✅ Database branching (like Git)
- ✅ Fast connection pooling
- ✅ Easy setup

### Setup Steps:

1. **Create Neon Account**
   - Go to https://neon.tech
   - Sign up (free)
   - Create a new project

2. **Get Connection String**
   - In Neon dashboard, click "Connection Details"
   - Copy the connection string (looks like: `postgresql://user:password@ep-xxx.us-east-1.aws.neon.tech/dbname?sslmode=require`)

3. **Update Prisma Schema**
   - Change `provider` from `"sqlite"` to `"postgresql"`
   - Change `url` to use `env("DATABASE_URL")`

4. **Set Environment Variable**
   - Local: Add `DATABASE_URL` to your `.env` file
   - Vercel: Add `DATABASE_URL` in Vercel dashboard → Settings → Environment Variables

5. **Run Migrations**
   ```bash
   npx prisma generate
   npx prisma migrate deploy
   ```

---

## Alternative Options

### Supabase (PostgreSQL)
- **Free Tier**: 500 MB database
- **Pros**: Additional features (Auth, Storage)
- **Setup**: https://supabase.com

### Railway (PostgreSQL)
- **Free Tier**: $5/month credit
- **Pros**: Very simple setup
- **Setup**: https://railway.app

### Vercel Postgres
- **Pricing**: Pay-as-you-go
- **Pros**: Fully integrated with Vercel
- **Setup**: Vercel dashboard → Storage → Postgres

### PlanetScale (MySQL)
- **Free Tier**: 1 GB storage
- **Pros**: Serverless MySQL
- **Note**: Requires Prisma MySQL adapter and different migration approach
- **Setup**: https://planetscale.com

---

## Quick Migration from SQLite to PostgreSQL

1. **Update `prisma/schema.prisma`:**
```prisma
datasource db {
  provider = "postgresql"  // Changed from "sqlite"
  url      = env("DATABASE_URL")
}
```

2. **Add DATABASE_URL to `.env`:**
```env
DATABASE_URL="postgresql://user:password@host:port/database?sslmode=require"
```

3. **Deploy migrations:**
```bash
npx prisma generate
npx prisma migrate deploy
```

That's it! Your Prisma schema is already compatible with PostgreSQL.

---

## My Recommendation

**Start with Neon** - it's the best fit for serverless apps on Vercel:
- Serverless = no cold starts
- Free tier is generous
- Built for modern apps
- Excellent documentation

