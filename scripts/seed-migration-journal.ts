/**
 * Utility script to seed the migration journal for existing instances
 * 
 * Run this script ONCE on instances that already have all database tables
 * but are missing the migration tracking records.
 * 
 * Usage: npx tsx scripts/seed-migration-journal.ts
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from "ws";
import fs from "fs";
import path from "path";
import crypto from "crypto";

neonConfig.webSocketConstructor = ws;

async function seedMigrationJournal() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL environment variable is required");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    console.log("[INFO] Checking migration journal...");

    // Check if drizzle migrations table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'drizzle' 
        AND table_name = '__drizzle_migrations'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      // Create the drizzle schema and migrations table
      await client.query(`CREATE SCHEMA IF NOT EXISTS drizzle;`);
      await client.query(`
        CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
          id SERIAL PRIMARY KEY,
          hash TEXT NOT NULL,
          created_at BIGINT NOT NULL
        );
      `);
      console.log("[INFO] Created drizzle migrations table");
    }

    // Check existing migrations
    const existingMigrations = await client.query(
      "SELECT hash FROM drizzle.__drizzle_migrations"
    );
    const existingHashes = new Set(existingMigrations.rows.map(r => r.hash));

    // Read migration files
    const migrationsDir = path.join(process.cwd(), "migrations");
    const journalPath = path.join(migrationsDir, "meta", "_journal.json");

    if (!fs.existsSync(journalPath)) {
      console.error("[ERROR] Migration journal not found at", journalPath);
      process.exit(1);
    }

    const journal = JSON.parse(fs.readFileSync(journalPath, "utf-8"));

    let seededCount = 0;

    for (const entry of journal.entries) {
      const migrationFile = path.join(migrationsDir, `${entry.tag}.sql`);
      
      if (!fs.existsSync(migrationFile)) {
        console.warn(`[WARN] Migration file not found: ${entry.tag}.sql`);
        continue;
      }

      const content = fs.readFileSync(migrationFile, "utf-8");
      const hash = crypto.createHash("sha256").update(content).digest("hex");

      if (existingHashes.has(hash)) {
        console.log(`[SKIP] Migration ${entry.tag} already recorded`);
        continue;
      }

      // Check if the first table from this migration exists
      // This is a heuristic to determine if the migration was applied
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
          console.log(`[SEEDED] Migration ${entry.tag} marked as applied`);
          seededCount++;
        } else {
          console.log(`[INFO] Migration ${entry.tag} needs to be applied (table ${tableName} doesn't exist)`);
        }
      }
    }

    if (seededCount > 0) {
      console.log(`\n[SUCCESS] Seeded ${seededCount} migration(s) to the journal`);
      console.log("[INFO] You can now restart your app normally");
    } else {
      console.log("\n[INFO] No migrations needed to be seeded");
    }

  } catch (error) {
    console.error("[ERROR] Failed to seed migration journal:", error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seedMigrationJournal();
