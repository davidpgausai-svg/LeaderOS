import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from "@shared/schema";
import path from "path";
import fs from "fs";

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'data', 'leaderos.db');

const dataDir = path.dirname(DB_PATH);
fs.mkdirSync(dataDir, { recursive: true });

const dbExists = fs.existsSync(DB_PATH);
console.log(`[DB] Database path: ${DB_PATH}`);
console.log(`[DB] Database exists: ${dbExists}`);
if (dbExists) {
  const stats = fs.statSync(DB_PATH);
  console.log(`[DB] Database size: ${stats.size} bytes, modified: ${stats.mtime.toISOString()}`);
}

const sqlite = new Database(DB_PATH);

sqlite.pragma('journal_mode = WAL');
sqlite.pragma('busy_timeout = 5000');
sqlite.pragma('synchronous = NORMAL');
sqlite.pragma('cache_size = -20000');
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite, { schema });
export { DB_PATH };
