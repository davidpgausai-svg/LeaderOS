import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = process.env.DATA_DIR || './data';
const DB_PATH = path.join(DATA_DIR, 'StrategicFlow.sqlite');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export const sqlite = new Database(DB_PATH);
sqlite.pragma('journal_mode = WAL');

export function initializeDatabase() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      password_hash TEXT,
      first_name TEXT,
      last_name TEXT,
      profile_image_url TEXT,
      role TEXT NOT NULL DEFAULT 'co_lead',
      timezone TEXT DEFAULT 'America/Chicago',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      sid TEXT PRIMARY KEY,
      sess TEXT NOT NULL,
      expire TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_session_expire ON sessions(expire);

    CREATE TABLE IF NOT EXISTS user_strategy_assignments (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      strategy_id TEXT NOT NULL,
      assigned_by TEXT NOT NULL,
      assigned_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, strategy_id)
    );

    CREATE TABLE IF NOT EXISTS strategies (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      goal TEXT,
      start_date TEXT NOT NULL,
      target_date TEXT NOT NULL,
      metrics TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Active',
      completion_date TEXT,
      color_code TEXT NOT NULL DEFAULT '#3B82F6',
      display_order INTEGER NOT NULL DEFAULT 0,
      progress INTEGER NOT NULL DEFAULT 0,
      case_for_change TEXT NOT NULL DEFAULT 'To be defined',
      vision_statement TEXT NOT NULL DEFAULT 'To be defined',
      success_metrics TEXT NOT NULL DEFAULT 'To be defined',
      stakeholder_map TEXT NOT NULL DEFAULT 'To be defined',
      readiness_rating TEXT NOT NULL DEFAULT 'To be defined',
      risk_exposure_rating TEXT NOT NULL DEFAULT 'To be defined',
      change_champion_assignment TEXT NOT NULL DEFAULT 'To be defined',
      reinforcement_plan TEXT NOT NULL DEFAULT 'To be defined',
      benefits_realization_plan TEXT NOT NULL DEFAULT 'To be defined',
      created_by TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      strategy_id TEXT NOT NULL,
      kpi TEXT NOT NULL,
      kpi_tracking TEXT,
      accountable_leaders TEXT NOT NULL,
      resources_required TEXT,
      start_date TEXT NOT NULL,
      due_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'NYS',
      progress INTEGER NOT NULL DEFAULT 0,
      is_archived TEXT NOT NULL DEFAULT 'false',
      document_folder_url TEXT,
      communication_url TEXT,
      created_by TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS barriers (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'medium',
      status TEXT NOT NULL DEFAULT 'active',
      owner_id TEXT,
      identified_date TEXT DEFAULT (datetime('now')),
      target_resolution_date TEXT,
      resolution_date TEXT,
      resolution_notes TEXT,
      created_by TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      description TEXT NOT NULL,
      user_id TEXT NOT NULL,
      strategy_id TEXT,
      project_id TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS actions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      strategy_id TEXT NOT NULL,
      project_id TEXT,
      target_value TEXT,
      current_value TEXT,
      measurement_unit TEXT,
      status TEXT NOT NULL DEFAULT 'in_progress',
      due_date TEXT,
      is_archived TEXT NOT NULL DEFAULT 'false',
      created_by TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS action_documents (
      id TEXT PRIMARY KEY,
      action_id TEXT NOT NULL,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS action_checklist_items (
      id TEXT PRIMARY KEY,
      action_id TEXT NOT NULL,
      title TEXT NOT NULL,
      is_completed TEXT NOT NULL DEFAULT 'false',
      order_index INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      related_entity_id TEXT,
      related_entity_type TEXT,
      is_read TEXT NOT NULL DEFAULT 'false',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS meeting_notes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      meeting_date TEXT NOT NULL,
      strategy_id TEXT NOT NULL,
      selected_project_ids TEXT NOT NULL,
      selected_action_ids TEXT NOT NULL,
      notes TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS dependencies (
      id TEXT PRIMARY KEY,
      source_type TEXT NOT NULL,
      source_id TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(source_type, source_id, target_type, target_id)
    );

    CREATE TABLE IF NOT EXISTS template_types (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      display_order INTEGER NOT NULL DEFAULT 0,
      created_by TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ai_chat_conversations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      message TEXT NOT NULL,
      role TEXT NOT NULL,
      context TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS registration_tokens (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      token TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      rotated_at TEXT,
      rotated_by TEXT
    );
  `);

  try {
    const existingToken = sqlite.prepare('SELECT token FROM registration_tokens WHERE id = 1').get();
    if (!existingToken) {
      const initialToken = generateRegistrationToken();
      sqlite.prepare("INSERT INTO registration_tokens (id, token, created_at) VALUES (1, ?, datetime('now'))").run(initialToken);
      console.log('[INFO] Initial registration token created');
    }
  } catch (error) {
    console.error('[ERROR] Failed to initialize registration token:', error);
  }
}

export function generateRegistrationToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

export function getRegistrationToken(): string | null {
  const row = sqlite.prepare('SELECT token FROM registration_tokens WHERE id = 1').get() as { token: string } | undefined;
  return row?.token || null;
}

export function rotateRegistrationToken(userId: string): string {
  const newToken = generateRegistrationToken();
  sqlite.prepare("UPDATE registration_tokens SET token = ?, rotated_at = datetime('now'), rotated_by = ? WHERE id = 1").run(newToken, userId);
  return newToken;
}

export function validateRegistrationToken(token: string): boolean {
  const row = sqlite.prepare('SELECT token FROM registration_tokens WHERE id = 1 AND token = ?').get(token);
  return !!row;
}

initializeDatabase();
