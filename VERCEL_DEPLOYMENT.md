# Vercel Deployment Guide

## Required Environment Variables for Vercel

Add these environment variables in your Vercel project settings (Settings → Environment Variables):

### Shopify App Configuration (Required)
```
SHOPIFY_API_KEY=f83cc75d66d87fca2a84f47b67e16a1b
SHOPIFY_API_SECRET=3c0cd8ca75d3e9abbe66b2568ebe9619
SCOPES=write_products,read_products,write_customers
SHOPIFY_APP_URL=https://frontend-product-builder.vercel.app
```

### Database Configuration (Required for Production)
**⚠️ Important:** SQLite file databases don't work on Vercel's serverless functions. You need a PostgreSQL database.

```
DATABASE_URL=postgresql://user:password@host:port/database
```

**Recommended PostgreSQL providers:**
- [Neon](https://neon.tech) - Free tier available
- [Supabase](https://supabase.com) - Free tier available  
- [Railway](https://railway.app) - Free tier available
- [PlanetScale](https://planetscale.com) - MySQL alternative
- [Vercel Postgres](https://vercel.com/storage/postgres) - Native integration

### Optional Configuration
```
SHOP_CUSTOM_DOMAIN=your-custom-domain.com
```

### Your Custom Variables
```
SHOPIFY_PRODUCT_BUILDER_FORM_ID=c454decf-ed2a-47ea-ac9c-12cf49bf17be
SHOPIFY_LOCATION_ID=gid://shopify/Location/74843783468
```

## Steps to Deploy

### 1. Update Prisma Schema for Production

Before deploying, update `prisma/schema.prisma` to support PostgreSQL:

```prisma
datasource db {
  provider = "postgresql"  // Change from "sqlite"
  url      = env("DATABASE_URL")
}
```

Then run:
```bash
npx prisma generate
npx prisma migrate deploy
```

### 2. Set Up Database

1. Create a PostgreSQL database with one of the providers above
2. Get your connection string (DATABASE_URL)
3. Add it to Vercel environment variables

### 3. Deploy to Vercel

```bash
# Install Vercel CLI if needed
npm i -g vercel

# Deploy
vercel

# Or connect your GitHub repo to Vercel dashboard
```

### 4. Update Shopify App URL

After deployment, update your `SHOPIFY_APP_URL` to your Vercel URL in:
- Vercel environment variables
- Shopify Partners dashboard → App Settings → App URL

## Local Development .env File

Create a `.env` file in your project root with:

```env
# Shopify App Configuration
SHOPIFY_API_KEY=f83cc75d66d87fca2a84f47b67e16a1b
SHOPIFY_API_SECRET=3c0cd8ca75d3e9abbe66b2568ebe9619
SCOPES=write_products,read_products,write_customers
SHOPIFY_APP_URL=https://frontend-product-builder.vercel.app

# Database - SQLite for local dev is fine
DATABASE_URL=file:./dev.sqlite

# Your custom variables
SHOPIFY_PRODUCT_BUILDER_FORM_ID=c454decf-ed2a-47ea-ac9c-12cf49bf17be
SHOPIFY_LOCATION_ID=gid://shopify/Location/74843783468
```

## Notes

- ❌ **Don't use** `SHOPIFY_ADMIN_API_TOKEN` - This is for private apps only
- ❌ **Don't use** `SHOP` - Not needed for OAuth-based apps
- ✅ **Required scope:** `write_customers` is needed to save customer metafields
- ✅ **Database:** Must be PostgreSQL (or MySQL) for Vercel production

