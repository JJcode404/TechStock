# Database Backup & Recovery Guide

## Current Backup Status ✅

**Latest Backup:** `techstock-2026-08-16T11-58-38-835Z.dump`  
**Location:** `backups/` folder  
**Database:** PostgreSQL (techstock)  
**Size:** 276 KB

---

## Backup Details

Your database backups are stored in the `backups/` directory with timestamps in the format:

```
techstock-YYYY-MM-DDTHH-MM-SS-MsZ.dump
```

---

## How to Create a Backup Manually

### Using the Terminal

Run this command from the project root:

```bash
PGPASSWORD=september pg_dump -U jj -h localhost -p 5432 techstock > backups/techstock-$(date +%Y-%m-%dT%H-%M-%S-%3NZ).dump
```

### What this does:

- Exports the entire PostgreSQL database `techstock`
- Saves it as a `.dump` file with a timestamp
- The file contains the complete schema and all data

### Connection Details:

- **Username:** `jj`
- **Password:** `september`
- **Host:** `localhost`
- **Port:** `5432`
- **Database:** `techstock`

---

## How to Restore from a Backup

### Option 1: Complete Database Restore (Replace Everything)

```bash
# 1. Drop the existing database (WARNING: This deletes all current data)
PGPASSWORD=september dropdb -U jj -h localhost -p 5432 techstock

# 2. Create a fresh database
PGPASSWORD=september createdb -U jj -h localhost -p 5432 techstock

# 3. Restore the backup (replace the filename with your backup)
PGPASSWORD=september psql -U jj -h localhost -p 5432 techstock < backups/techstock-2026-08-16T11-58-38-835Z.dump
```

### Option 2: Restore to a Different Database (Safe Testing)

```bash
# 1. Create a new test database
PGPASSWORD=september createdb -U jj -h localhost -p 5432 techstock_test

# 2. Restore the backup to the test database
PGPASSWORD=september psql -U jj -h localhost -p 5432 techstock_test < backups/techstock-2026-08-16T11-58-38-835Z.dump

# 3. Test your application with this database by updating DATABASE_URL in .env
# DATABASE_URL=postgresql://jj:september@localhost:5432/techstock_test?schema=public
```

---

## Step-by-Step Recovery Instructions

### If Your Database Gets Corrupted or Accidentally Deleted:

**Step 1:** Stop your application

```bash
# Stop the dev server if running
# Press Ctrl+C in the terminal running npm run dev
```

**Step 2:** Check available backups

```bash
ls -lh backups/*.dump
```

**Step 3:** Choose your recovery method:

**For Production (Replace Current Data):**

```bash
# Drop current database
PGPASSWORD=september dropdb -U jj -h localhost -p 5432 techstock 2>/dev/null || true

# Create new database
PGPASSWORD=september createdb -U jj -h localhost -p 5432 techstock

# Restore from backup
PGPASSWORD=september psql -U jj -h localhost -p 5432 techstock < backups/techstock-2026-08-16T11-58-38-835Z.dump
```

**Step 4:** Restart your application

```bash
npm run dev
```

**Step 5:** Verify the data

- Log in to the POS application
- Check that all categories, products, and data are present
- Run a test transaction

---

## Database Recovery Details

### What Gets Backed Up

✅ All database tables and schemas  
✅ All data (products, categories, sales, customers, etc.)  
✅ Indexes and constraints  
✅ User roles and permissions

### What Doesn't Get Backed Up

❌ .env file (keep this safe separately!)  
❌ Product images in `product-images/` folder  
❌ Upload files in `uploads/` folder

**To backup everything:**

```bash
# Backup database
PGPASSWORD=september pg_dump -U jj -h localhost -p 5432 techstock > backups/techstock-backup.dump

# Backup images and uploads
tar -czf backups/files-backup-$(date +%Y-%m-%d).tar.gz product-images/ uploads/
```

---

## Automated Backup Strategy (Recommended)

Create a cron job to automatically backup daily:

```bash
# Add to your crontab (crontab -e)
0 2 * * * cd /home/jj/repo/TechStock && PGPASSWORD=september pg_dump -U jj -h localhost -p 5432 techstock > backups/techstock-$(date +\%Y-\%m-\%dT\%H-\%M-\%S).dump

# This runs the backup every day at 2 AM
```

---

## Emergency Recovery Checklist

- [ ] Stop the application
- [ ] List available backups: `ls -lh backups/`
- [ ] Decide which backup to restore from
- [ ] Drop existing database (if corrupted)
- [ ] Create new database
- [ ] Restore backup
- [ ] Verify Prisma schema matches: `npx prisma db push --skip-generate`
- [ ] Restart application
- [ ] Test key features (login, add product, make sale)

---

## Restore Verification Commands

After restoring, verify the database integrity:

```bash
# Connect to the database
PGPASSWORD=september psql -U jj -h localhost -p 5432 techstock

# Inside psql, run:
\dt                              # List all tables
SELECT COUNT(*) FROM products;   # Count products
SELECT COUNT(*) FROM categories; # Count categories
SELECT COUNT(*) FROM sales;      # Count sales
\q                               # Exit
```

---

## Important Notes

⚠️ **Keep your `.env` file safe** - It contains database credentials  
⚠️ **Don't commit backups to Git** - They're already in `.gitignore`  
⚠️ **Test restore procedures** - Verify backups work before disaster strikes  
⚠️ **Keep multiple backups** - Don't overwrite old backups immediately  
⚠️ **Store backups elsewhere** - Consider uploading to cloud storage

---

## Quick Reference

| Task            | Command                                                                                        |
| --------------- | ---------------------------------------------------------------------------------------------- |
| Create backup   | `PGPASSWORD=september pg_dump -U jj -h localhost -p 5432 techstock > backups/backup-name.dump` |
| List backups    | `ls -lh backups/*.dump`                                                                        |
| Restore         | `PGPASSWORD=september psql -U jj -h localhost -p 5432 techstock < backups/backup-name.dump`    |
| Check DB size   | `PGPASSWORD=september psql -U jj -h localhost -p 5432 -c "\db+"`                               |
| Test connection | `PGPASSWORD=september psql -U jj -h localhost -p 5432 -d techstock -c "SELECT 1;"`             |
