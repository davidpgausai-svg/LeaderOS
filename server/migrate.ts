import { migrate } from "drizzle-orm/neon-serverless/migrator";
import { drizzle } from "drizzle-orm/neon-serverless";
import { pool } from "./db";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function seedMigrationJournalIfNeeded(client: any) {
  // Check if any app tables exist (e.g., users table)
  const appTablesCheck = await client.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'users'
    );
  `);

  const appTablesExist = appTablesCheck.rows[0].exists;

  // If app tables exist, always check for missing migrations in the journal
  // This handles cases where:
  // 1. Journal doesn't exist but tables do
  // 2. Journal is empty but tables exist
  // 3. Journal has some entries but is missing newer migrations for tables that exist
  if (appTablesExist) {
    console.log("[INFO] Checking for missing migration journal entries...");
    await seedJournal(client);
  }
}

async function seedJournal(client: any) {
  // Create the drizzle schema and migrations table if needed
  await client.query(`CREATE SCHEMA IF NOT EXISTS drizzle;`);
  await client.query(`
    CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
      id SERIAL PRIMARY KEY,
      hash TEXT NOT NULL,
      created_at BIGINT NOT NULL
    );
  `);

  // Read migration files
  const migrationsDir = path.join(__dirname, "..", "migrations");
  const journalPath = path.join(migrationsDir, "meta", "_journal.json");

  if (!fs.existsSync(journalPath)) {
    console.log("[WARN] No migration journal found - skipping seed");
    return;
  }

  const journal = JSON.parse(fs.readFileSync(journalPath, "utf-8"));

  // Check existing migrations
  const existingMigrations = await client.query(
    "SELECT hash FROM drizzle.__drizzle_migrations"
  );
  const existingHashes = new Set(existingMigrations.rows.map((r: any) => r.hash));

  for (const entry of journal.entries) {
    const migrationFile = path.join(migrationsDir, `${entry.tag}.sql`);
    
    if (!fs.existsSync(migrationFile)) {
      continue;
    }

    const content = fs.readFileSync(migrationFile, "utf-8");
    const hash = crypto.createHash("sha256").update(content).digest("hex");

    if (existingHashes.has(hash)) {
      continue;
    }

    // Check if the first table from this migration exists
    const tableMatch = content.match(/CREATE TABLE "([^"]+)"/);
    if (tableMatch) {
      const tableName = tableMatch[1];
      const tableExists = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        );
      `, [tableName]);

      if (tableExists.rows[0].exists) {
        // Table exists, mark migration as applied
        await client.query(
          "INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)",
          [hash, entry.when]
        );
        console.log(`[INFO] Auto-seeded migration: ${entry.tag}`);
      }
    } else {
      // For DROP TABLE migrations, check if it's a cleanup migration
      const dropMatch = content.match(/DROP TABLE "([^"]+)"/);
      if (dropMatch) {
        const tableName = dropMatch[1];
        const tableExists = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
          );
        `, [tableName]);

        if (!tableExists.rows[0].exists) {
          // Table doesn't exist (was dropped), mark migration as applied
          await client.query(
            "INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)",
            [hash, entry.when]
          );
          console.log(`[INFO] Auto-seeded migration: ${entry.tag}`);
        }
      }
    }
  }
}

export async function runMigrations() {
  console.log("[INFO] Running database migrations...");
  
  const client = await pool.connect();
  
  try {
    // Acquire advisory lock - this will WAIT if another process has it
    // This ensures all instances wait for migrations to complete before starting
    console.log("[INFO] Acquiring migration lock...");
    await client.query("SELECT pg_advisory_lock(12345)");
    console.log("[INFO] Migration lock acquired");
    
    // Auto-seed migration journal if tables exist but aren't tracked
    await seedMigrationJournalIfNeeded(client);
    
    // Create a dedicated drizzle instance for migration
    const migrationDb = drizzle({ client });
    
    await migrate(migrationDb, {
      migrationsFolder: path.join(__dirname, "..", "migrations"),
    });
    
    console.log("[INFO] Database migrations completed successfully");
    
    // Release advisory lock
    await client.query("SELECT pg_advisory_unlock(12345)");
  } catch (error) {
    // Release lock on error
    await client.query("SELECT pg_advisory_unlock(12345)").catch(() => {});
    console.error("[ERROR] Database migration failed:", error);
    throw error;
  } finally {
    client.release();
  }
}
