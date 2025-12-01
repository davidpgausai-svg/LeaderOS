import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const DATA_DIR = process.env.DATA_DIR || './data';
const DB_PATH = path.join(DATA_DIR, 'StrategicFlow.sqlite');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export const sqlite = new Database(DB_PATH);
sqlite.pragma('journal_mode = WAL');

export function initializeDatabase() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      registration_token TEXT NOT NULL UNIQUE,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_org_token ON organizations(registration_token);

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      password_hash TEXT,
      first_name TEXT,
      last_name TEXT,
      profile_image_url TEXT,
      role TEXT NOT NULL DEFAULT 'co_lead',
      timezone TEXT DEFAULT 'America/Chicago',
      organization_id TEXT,
      is_super_admin TEXT NOT NULL DEFAULT 'false',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_users_org ON users(organization_id);

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
      organization_id TEXT,
      created_by TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_strategies_org ON strategies(organization_id);

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
      organization_id TEXT,
      created_by TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_projects_org ON projects(organization_id);

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
      organization_id TEXT,
      created_by TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_barriers_org ON barriers(organization_id);

    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      description TEXT NOT NULL,
      user_id TEXT NOT NULL,
      strategy_id TEXT,
      project_id TEXT,
      organization_id TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_activities_org ON activities(organization_id);

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
      organization_id TEXT,
      created_by TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_actions_org ON actions(organization_id);

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
      organization_id TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_notifications_org ON notifications(organization_id);

    CREATE TABLE IF NOT EXISTS meeting_notes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      meeting_date TEXT NOT NULL,
      strategy_id TEXT NOT NULL,
      selected_project_ids TEXT NOT NULL,
      selected_action_ids TEXT NOT NULL,
      notes TEXT NOT NULL,
      organization_id TEXT,
      created_by TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_meeting_notes_org ON meeting_notes(organization_id);

    CREATE TABLE IF NOT EXISTS dependencies (
      id TEXT PRIMARY KEY,
      source_type TEXT NOT NULL,
      source_id TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      organization_id TEXT,
      created_by TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(source_type, source_id, target_type, target_id)
    );
    CREATE INDEX IF NOT EXISTS idx_dependencies_org ON dependencies(organization_id);

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
      organization_id TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_ai_chat_org ON ai_chat_conversations(organization_id);
  `);

  runMigrations();
}

function runMigrations() {
  try {
    const columns = sqlite.prepare("PRAGMA table_info(users)").all() as { name: string }[];
    const hasOrgId = columns.some(col => col.name === 'organization_id');
    
    if (!hasOrgId) {
      console.log('[MIGRATION] Adding organization_id column to users table...');
      sqlite.exec('ALTER TABLE users ADD COLUMN organization_id TEXT');
      sqlite.exec('ALTER TABLE users ADD COLUMN is_super_admin TEXT NOT NULL DEFAULT "false"');
    }

    const stratColumns = sqlite.prepare("PRAGMA table_info(strategies)").all() as { name: string }[];
    if (!stratColumns.some(col => col.name === 'organization_id')) {
      console.log('[MIGRATION] Adding organization_id column to strategies table...');
      sqlite.exec('ALTER TABLE strategies ADD COLUMN organization_id TEXT');
    }

    const projColumns = sqlite.prepare("PRAGMA table_info(projects)").all() as { name: string }[];
    if (!projColumns.some(col => col.name === 'organization_id')) {
      console.log('[MIGRATION] Adding organization_id column to projects table...');
      sqlite.exec('ALTER TABLE projects ADD COLUMN organization_id TEXT');
    }

    const actColumns = sqlite.prepare("PRAGMA table_info(actions)").all() as { name: string }[];
    if (!actColumns.some(col => col.name === 'organization_id')) {
      console.log('[MIGRATION] Adding organization_id column to actions table...');
      sqlite.exec('ALTER TABLE actions ADD COLUMN organization_id TEXT');
    }

    const activColumns = sqlite.prepare("PRAGMA table_info(activities)").all() as { name: string }[];
    if (!activColumns.some(col => col.name === 'organization_id')) {
      console.log('[MIGRATION] Adding organization_id column to activities table...');
      sqlite.exec('ALTER TABLE activities ADD COLUMN organization_id TEXT');
    }

    const notifColumns = sqlite.prepare("PRAGMA table_info(notifications)").all() as { name: string }[];
    if (!notifColumns.some(col => col.name === 'organization_id')) {
      console.log('[MIGRATION] Adding organization_id column to notifications table...');
      sqlite.exec('ALTER TABLE notifications ADD COLUMN organization_id TEXT');
    }

    const meetColumns = sqlite.prepare("PRAGMA table_info(meeting_notes)").all() as { name: string }[];
    if (!meetColumns.some(col => col.name === 'organization_id')) {
      console.log('[MIGRATION] Adding organization_id column to meeting_notes table...');
      sqlite.exec('ALTER TABLE meeting_notes ADD COLUMN organization_id TEXT');
    }

    const barrierColumns = sqlite.prepare("PRAGMA table_info(barriers)").all() as { name: string }[];
    if (!barrierColumns.some(col => col.name === 'organization_id')) {
      console.log('[MIGRATION] Adding organization_id column to barriers table...');
      sqlite.exec('ALTER TABLE barriers ADD COLUMN organization_id TEXT');
    }

    const depColumns = sqlite.prepare("PRAGMA table_info(dependencies)").all() as { name: string }[];
    if (!depColumns.some(col => col.name === 'organization_id')) {
      console.log('[MIGRATION] Adding organization_id column to dependencies table...');
      sqlite.exec('ALTER TABLE dependencies ADD COLUMN organization_id TEXT');
    }

    const chatColumns = sqlite.prepare("PRAGMA table_info(ai_chat_conversations)").all() as { name: string }[];
    if (!chatColumns.some(col => col.name === 'organization_id')) {
      console.log('[MIGRATION] Adding organization_id column to ai_chat_conversations table...');
      sqlite.exec('ALTER TABLE ai_chat_conversations ADD COLUMN organization_id TEXT');
    }

    migrateExistingDataToDefaultOrg();
    
    setupSuperAdmin();
    
  } catch (error) {
    console.error('[MIGRATION ERROR]', error);
  }
}

function migrateExistingDataToDefaultOrg() {
  const existingUsers = sqlite.prepare('SELECT id FROM users WHERE organization_id IS NULL').all();
  
  if (existingUsers.length > 0) {
    console.log(`[MIGRATION] Found ${existingUsers.length} users without organization. Creating default organization...`);
    
    let defaultOrg = sqlite.prepare('SELECT id FROM organizations WHERE name = ?').get('Default Organization') as { id: string } | undefined;
    
    if (!defaultOrg) {
      const orgId = crypto.randomUUID();
      const envToken = process.env.INITIAL_REGISTRATION_TOKEN;
      const token = envToken && envToken.length >= 16 ? envToken : generateRegistrationToken();
      
      sqlite.prepare('INSERT INTO organizations (id, name, registration_token) VALUES (?, ?, ?)').run(orgId, 'Default Organization', token);
      defaultOrg = { id: orgId };
      console.log('[MIGRATION] Created Default Organization');
    }
    
    sqlite.exec(`UPDATE users SET organization_id = '${defaultOrg.id}' WHERE organization_id IS NULL`);
    sqlite.exec(`UPDATE strategies SET organization_id = '${defaultOrg.id}' WHERE organization_id IS NULL`);
    sqlite.exec(`UPDATE projects SET organization_id = '${defaultOrg.id}' WHERE organization_id IS NULL`);
    sqlite.exec(`UPDATE actions SET organization_id = '${defaultOrg.id}' WHERE organization_id IS NULL`);
    sqlite.exec(`UPDATE activities SET organization_id = '${defaultOrg.id}' WHERE organization_id IS NULL`);
    sqlite.exec(`UPDATE notifications SET organization_id = '${defaultOrg.id}' WHERE organization_id IS NULL`);
    sqlite.exec(`UPDATE meeting_notes SET organization_id = '${defaultOrg.id}' WHERE organization_id IS NULL`);
    sqlite.exec(`UPDATE barriers SET organization_id = '${defaultOrg.id}' WHERE organization_id IS NULL`);
    sqlite.exec(`UPDATE dependencies SET organization_id = '${defaultOrg.id}' WHERE organization_id IS NULL`);
    sqlite.exec(`UPDATE ai_chat_conversations SET organization_id = '${defaultOrg.id}' WHERE organization_id IS NULL`);
    
    console.log('[MIGRATION] Migrated existing data to Default Organization');
  }
}

function setupSuperAdmin() {
  const superAdminEmails = process.env.SUPER_ADMIN_EMAILS?.split(',').map(e => e.trim().toLowerCase()) || [];
  
  if (superAdminEmails.length > 0) {
    for (const email of superAdminEmails) {
      const user = sqlite.prepare('SELECT id FROM users WHERE LOWER(email) = ?').get(email);
      if (user) {
        sqlite.prepare('UPDATE users SET is_super_admin = ? WHERE LOWER(email) = ?').run('true', email);
        console.log(`[INFO] Set ${email} as Super Admin`);
      }
    }
  } else {
    const existingSuperAdmin = sqlite.prepare('SELECT id FROM users WHERE is_super_admin = ?').get('true');
    if (!existingSuperAdmin) {
      const firstUser = sqlite.prepare('SELECT id, email FROM users ORDER BY created_at ASC LIMIT 1').get() as { id: string; email: string } | undefined;
      if (firstUser) {
        sqlite.prepare('UPDATE users SET is_super_admin = ? WHERE id = ?').run('true', firstUser.id);
        console.log(`[INFO] Set first user (${firstUser.email}) as Super Admin (no SUPER_ADMIN_EMAILS configured)`);
      }
    }
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

export function getOrganizationByToken(token: string): { id: string; name: string } | null {
  const row = sqlite.prepare('SELECT id, name FROM organizations WHERE registration_token = ?').get(token) as { id: string; name: string } | undefined;
  return row || null;
}

export function createOrganization(name: string): { id: string; name: string; registrationToken: string } {
  const id = crypto.randomUUID();
  const token = generateRegistrationToken();
  sqlite.prepare('INSERT INTO organizations (id, name, registration_token) VALUES (?, ?, ?)').run(id, name, token);
  return { id, name, registrationToken: token };
}

export function getAllOrganizations(): { id: string; name: string; registrationToken: string; createdAt: string }[] {
  return sqlite.prepare('SELECT id, name, registration_token as registrationToken, created_at as createdAt FROM organizations ORDER BY created_at ASC').all() as any[];
}

export function rotateOrganizationToken(orgId: string): string {
  const newToken = generateRegistrationToken();
  sqlite.prepare('UPDATE organizations SET registration_token = ? WHERE id = ?').run(newToken, orgId);
  return newToken;
}

export function deleteOrganization(orgId: string): void {
  sqlite.exec(`DELETE FROM users WHERE organization_id = '${orgId}'`);
  sqlite.exec(`DELETE FROM strategies WHERE organization_id = '${orgId}'`);
  sqlite.exec(`DELETE FROM projects WHERE organization_id = '${orgId}'`);
  sqlite.exec(`DELETE FROM actions WHERE organization_id = '${orgId}'`);
  sqlite.exec(`DELETE FROM activities WHERE organization_id = '${orgId}'`);
  sqlite.exec(`DELETE FROM notifications WHERE organization_id = '${orgId}'`);
  sqlite.exec(`DELETE FROM meeting_notes WHERE organization_id = '${orgId}'`);
  sqlite.exec(`DELETE FROM barriers WHERE organization_id = '${orgId}'`);
  sqlite.exec(`DELETE FROM dependencies WHERE organization_id = '${orgId}'`);
  sqlite.exec(`DELETE FROM ai_chat_conversations WHERE organization_id = '${orgId}'`);
  sqlite.prepare('DELETE FROM organizations WHERE id = ?').run(orgId);
}

initializeDatabase();
