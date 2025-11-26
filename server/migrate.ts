import { migrate } from "drizzle-orm/neon-serverless/migrator";
import { drizzle } from "drizzle-orm/neon-serverless";
import { pool } from "./db";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrations() {
  console.log("[INFO] Running database migrations...");
  
  const client = await pool.connect();
  
  try {
    // Acquire advisory lock - this will WAIT if another process has it
    // This ensures all instances wait for migrations to complete before starting
    console.log("[INFO] Acquiring migration lock...");
    await client.query("SELECT pg_advisory_lock(12345)");
    console.log("[INFO] Migration lock acquired");
    
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
