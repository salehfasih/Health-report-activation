# Fix: Database Schema Not Empty Error

## The Problem
```
Error: P3005
The database schema is not empty. Read more about how to baseline an existing production database
```

This means your database has tables, but Prisma doesn't know which migrations have been run.

## Solution: Baseline the Database

### Step 1: Check if Session Table Exists

Run this in your Neon SQL editor or database tool:

```sql
SELECT * FROM "Session" LIMIT 1;
```

Or check if it exists:
```sql
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_name = 'Session'
);
```

### Step 2A: If Session Table EXISTS

Mark the migration as already applied (baseline):

```bash
npx prisma migrate resolve --applied 20240530213853_create_session_table
```

Then try deploying again!

### Step 2B: If Session Table DOES NOT EXIST

Create it manually:

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

### Step 2C: If You Have Other Tables You Don't Need

Reset and start fresh (⚠️ DELETES ALL DATA):

```bash
npx prisma migrate reset
```

This will:
1. Drop all tables
2. Run all migrations
3. Create fresh database

**⚠️ Only use this if you don't have important data!**

## Recommended: Quick Fix

Most likely you need to baseline:

```bash
npx prisma migrate resolve --applied 20240530213853_create_session_table
```

This tells Prisma "this migration was already applied" without running it.

