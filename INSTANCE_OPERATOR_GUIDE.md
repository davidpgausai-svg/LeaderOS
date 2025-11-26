# Instance Operator Guide

This guide explains how to keep your StrategicFlow instance synchronized with the MASTER app.

## Overview

StrategicFlow uses a **migration-based database synchronization** system. When the MASTER app adds new database tables or columns, your instance automatically applies those changes on startup.

---

## How It Works

1. **MASTER app** defines the database schema and creates migration files
2. **Migration files** are stored in the `migrations/` folder and committed to GitHub
3. **Your instance** runs migrations automatically when the app starts
4. **Each instance** has its own database, keeping your data separate and secure
5. **Advisory locks** prevent conflicts when multiple processes start simultaneously

---

## Keeping Your Instance Updated

### Step 1: Pull Latest Changes from GitHub

In your Replit instance, open the Shell and run:

```bash
git pull origin main
```

This downloads any new code and migration files from the MASTER app.

### Step 2: Restart Your App

Simply click the **Run** button or restart your workflow. The app will:

1. Acquire a database lock to prevent concurrent migrations
2. Automatically detect any pending database migrations
3. Apply them to your database
4. Release the lock and start the server

You'll see this in the console:
```
[INFO] Running database migrations...
[INFO] Database migrations completed successfully
```

---

## First-Time Setup for Existing Instances

If your instance already has database tables but is being updated to use the new migration system, you need to run a one-time setup:

```bash
npx tsx scripts/seed-migration-journal.ts
```

This script will:
- Check which tables already exist in your database
- Mark the corresponding migrations as "already applied"
- Prevent the migration system from trying to recreate existing tables

After running this script, you can restart your app normally.

---

## What Happens During Migrations

- **New tables** are created if they don't exist
- **New columns** are added to existing tables
- **Your existing data** is preserved
- **Drizzle ORM** tracks which migrations have been applied
- **Concurrent protection** prevents conflicts if multiple instances start at once

---

## Troubleshooting

### "Relation already exists" Error
This means your database already has the table but the migration journal doesn't know about it. Run:
```bash
npx tsx scripts/seed-migration-journal.ts
```

### "Acquiring migration lock..." Message Takes a Long Time
This is normal - it means another instance is currently running migrations. Your instance will wait for that process to complete before continuing. Once the lock is released, your instance will verify migrations and start the server.

### Migration Failed
1. Check the console for the specific error
2. Run `npx tsx scripts/seed-migration-journal.ts` if tables already exist
3. Contact the MASTER administrator with the error message
4. Do NOT manually modify database tables

### App Won't Start
1. Ensure you've run `git pull` to get the latest code
2. Check that your `DATABASE_URL` secret is correctly set
3. Verify your database is accessible

---

## Important Notes

- **Never manually modify** database tables directly
- **Always use `git pull`** before restarting to get the latest migrations
- **Each instance** has isolated data - changes in one instance don't affect others
- **The MASTER app** is the only place where new migrations are created

---

## For MASTER Administrators

When adding new schema changes to the MASTER app:

1. Modify `shared/schema.ts` with your changes
2. Run `npx drizzle-kit generate` to create migration files
3. Test the migration in MASTER
4. Commit and push:
   - `shared/schema.ts`
   - `migrations/` folder (including `meta/` subdirectory)
   - `scripts/seed-migration-journal.ts` (if updated)
5. Notify instance operators to pull and restart

### Handling Existing MASTER Database

If your MASTER database already has the tables, seed the journal:
```bash
npx tsx scripts/seed-migration-journal.ts
```

---

## Quick Reference

| Action | Command |
|--------|---------|
| Pull latest changes | `git pull origin main` |
| Seed migration journal (first time) | `npx tsx scripts/seed-migration-journal.ts` |
| Check current branch | `git branch` |
| View migration files | `ls migrations/` |
| Restart app | Click Run button or restart workflow |

---

## Contact

If you encounter issues with database synchronization, contact the MASTER app administrator.
