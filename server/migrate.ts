import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), "data", "leaderos.db");

export function runMigrations() {
  console.log("[INFO] Running database migrations...");

  const dataDir = path.dirname(DB_PATH);
  fs.mkdirSync(dataDir, { recursive: true });

  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  const statements = getCreateTableStatements();

  sqlite.transaction(() => {
    for (const stmt of statements) {
      sqlite.exec(stmt);
    }
  })();

  runAlterTableMigrations(sqlite);

  sqlite.close();
  console.log("[INFO] Database migrations completed successfully");
}

function safeAddColumn(sqlite: InstanceType<typeof Database>, table: string, column: string, definition: string) {
  try {
    const cols = sqlite.pragma(`table_info(${table})`) as { name: string }[];
    if (!cols.find(c => c.name === column)) {
      sqlite.exec(`ALTER TABLE "${table}" ADD COLUMN "${column}" ${definition}`);
    }
  } catch {}
}

function runAlterTableMigrations(sqlite: InstanceType<typeof Database>) {
  safeAddColumn(sqlite, "projects", "is_workstream", "text NOT NULL DEFAULT 'false'");
  safeAddColumn(sqlite, "projects", "workstream_id", "text");
}

function getCreateTableStatements(): string[] {
  return [
    `CREATE TABLE IF NOT EXISTS "organizations" (
      "id" text PRIMARY KEY,
      "name" text NOT NULL,
      "registration_token" text NOT NULL UNIQUE,
      "created_at" integer,
      "updated_at" integer
    )`,

    `CREATE TABLE IF NOT EXISTS "sessions" (
      "sid" text PRIMARY KEY,
      "sess" text NOT NULL,
      "expire" integer NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "sessions" ("expire")`,

    `CREATE TABLE IF NOT EXISTS "users" (
      "id" text PRIMARY KEY,
      "email" text UNIQUE,
      "password_hash" text,
      "first_name" text,
      "last_name" text,
      "profile_image_url" text,
      "role" text NOT NULL DEFAULT 'co_lead',
      "timezone" text DEFAULT 'America/Chicago',
      "organization_id" text,
      "is_super_admin" text NOT NULL DEFAULT 'false',
      "fte" text DEFAULT '1.0',
      "salary" integer,
      "service_delivery_hours" text DEFAULT '0',
      "two_factor_enabled" text NOT NULL DEFAULT 'false',
      "must_change_password" text NOT NULL DEFAULT 'false',
      "created_at" integer,
      "updated_at" integer
    )`,

    `CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
      "id" text PRIMARY KEY,
      "user_id" text NOT NULL,
      "token_hash" text NOT NULL,
      "expires_at" integer NOT NULL,
      "used_at" integer,
      "created_at" integer
    )`,

    `CREATE TABLE IF NOT EXISTS "two_factor_codes" (
      "id" text PRIMARY KEY,
      "user_id" text NOT NULL,
      "code_hash" text NOT NULL,
      "type" text NOT NULL DEFAULT 'login',
      "expires_at" integer NOT NULL,
      "used_at" integer,
      "attempts" integer NOT NULL DEFAULT 0,
      "organization_id" text,
      "created_at" integer
    )`,

    `CREATE TABLE IF NOT EXISTS "user_strategy_assignments" (
      "id" text PRIMARY KEY,
      "user_id" text NOT NULL,
      "strategy_id" text NOT NULL,
      "assigned_by" text NOT NULL,
      "assigned_at" integer,
      UNIQUE("user_id", "strategy_id")
    )`,

    `CREATE TABLE IF NOT EXISTS "project_resource_assignments" (
      "id" text PRIMARY KEY,
      "project_id" text NOT NULL,
      "user_id" text NOT NULL,
      "hours_per_week" text NOT NULL DEFAULT '0',
      "organization_id" text NOT NULL,
      "assigned_by" text NOT NULL,
      "created_at" integer,
      "updated_at" integer,
      UNIQUE("project_id", "user_id")
    )`,

    `CREATE TABLE IF NOT EXISTS "action_people_assignments" (
      "id" text PRIMARY KEY,
      "action_id" text NOT NULL,
      "user_id" text NOT NULL,
      "organization_id" text NOT NULL,
      "assigned_by" text NOT NULL,
      "created_at" integer,
      UNIQUE("action_id", "user_id")
    )`,

    `CREATE TABLE IF NOT EXISTS "strategies" (
      "id" text PRIMARY KEY,
      "title" text NOT NULL,
      "description" text NOT NULL,
      "goal" text,
      "start_date" integer,
      "target_date" integer,
      "metrics" text NOT NULL,
      "status" text NOT NULL DEFAULT 'Active',
      "completion_date" integer,
      "color_code" text NOT NULL DEFAULT '#3B82F6',
      "display_order" integer NOT NULL DEFAULT 0,
      "progress" integer NOT NULL DEFAULT 0,
      "case_for_change" text NOT NULL DEFAULT 'To be defined',
      "vision_statement" text NOT NULL DEFAULT 'To be defined',
      "success_metrics" text NOT NULL DEFAULT 'To be defined',
      "stakeholder_map" text NOT NULL DEFAULT 'To be defined',
      "readiness_rating" text NOT NULL DEFAULT 'To be defined',
      "risk_exposure_rating" text NOT NULL DEFAULT 'To be defined',
      "change_champion_assignment" text NOT NULL DEFAULT 'To be defined',
      "reinforcement_plan" text NOT NULL DEFAULT 'To be defined',
      "benefits_realization_plan" text NOT NULL DEFAULT 'To be defined',
      "hidden_continuum_sections" text DEFAULT '[]',
      "custom_continuum_sections" text DEFAULT '[]',
      "organization_id" text,
      "executive_goal_id" text,
      "created_by" text NOT NULL,
      "created_at" integer
    )`,

    `CREATE TABLE IF NOT EXISTS "projects" (
      "id" text PRIMARY KEY,
      "title" text NOT NULL,
      "description" text NOT NULL,
      "strategy_id" text NOT NULL,
      "kpi" text,
      "kpi_tracking" text,
      "accountable_leaders" text NOT NULL,
      "resources_required" text,
      "start_date" integer NOT NULL,
      "due_date" integer NOT NULL,
      "status" text NOT NULL DEFAULT 'NYS',
      "completion_date" integer,
      "progress" integer NOT NULL DEFAULT 0,
      "is_archived" text NOT NULL DEFAULT 'false',
      "archive_reason" text,
      "archived_at" integer,
      "archived_by" text,
      "progress_at_archive" integer,
      "wake_up_date" integer,
      "document_folder_url" text,
      "communication_url" text,
      "is_workstream" text NOT NULL DEFAULT 'false',
      "workstream_id" text,
      "organization_id" text,
      "created_by" text NOT NULL,
      "created_at" integer
    )`,

    `CREATE TABLE IF NOT EXISTS "project_snapshots" (
      "id" text PRIMARY KEY,
      "project_id" text NOT NULL,
      "snapshot_data" text NOT NULL,
      "snapshot_type" text NOT NULL,
      "reason" text,
      "created_by" text NOT NULL,
      "organization_id" text,
      "created_at" integer
    )`,

    `CREATE TABLE IF NOT EXISTS "barriers" (
      "id" text PRIMARY KEY,
      "project_id" text NOT NULL,
      "title" text NOT NULL,
      "description" text NOT NULL,
      "severity" text NOT NULL DEFAULT 'medium',
      "status" text NOT NULL DEFAULT 'active',
      "owner_id" text,
      "identified_date" integer,
      "target_resolution_date" integer,
      "resolution_date" integer,
      "resolution_notes" text,
      "organization_id" text,
      "created_by" text NOT NULL,
      "created_at" integer,
      "updated_at" integer
    )`,

    `CREATE TABLE IF NOT EXISTS "activities" (
      "id" text PRIMARY KEY,
      "type" text NOT NULL,
      "description" text NOT NULL,
      "user_id" text NOT NULL,
      "strategy_id" text,
      "project_id" text,
      "organization_id" text,
      "created_at" integer
    )`,

    `CREATE TABLE IF NOT EXISTS "actions" (
      "id" text PRIMARY KEY,
      "title" text NOT NULL,
      "description" text NOT NULL,
      "strategy_id" text NOT NULL,
      "project_id" text,
      "target_value" text,
      "current_value" text,
      "measurement_unit" text,
      "status" text NOT NULL DEFAULT 'in_progress',
      "achieved_date" integer,
      "due_date" integer,
      "is_archived" text NOT NULL DEFAULT 'false',
      "document_folder_url" text,
      "notes" text,
      "organization_id" text,
      "created_by" text NOT NULL,
      "created_at" integer
    )`,

    `CREATE TABLE IF NOT EXISTS "action_documents" (
      "id" text PRIMARY KEY,
      "action_id" text NOT NULL,
      "name" text NOT NULL,
      "url" text NOT NULL,
      "created_at" integer
    )`,

    `CREATE TABLE IF NOT EXISTS "action_checklist_items" (
      "id" text PRIMARY KEY,
      "action_id" text NOT NULL,
      "title" text NOT NULL,
      "is_completed" text NOT NULL DEFAULT 'false',
      "order_index" integer NOT NULL DEFAULT 0,
      "indent_level" integer NOT NULL DEFAULT 1,
      "created_at" integer
    )`,

    `CREATE TABLE IF NOT EXISTS "notifications" (
      "id" text PRIMARY KEY,
      "user_id" text NOT NULL,
      "type" text NOT NULL,
      "title" text NOT NULL,
      "message" text NOT NULL,
      "related_entity_id" text,
      "related_entity_type" text,
      "is_read" text NOT NULL DEFAULT 'false',
      "organization_id" text,
      "created_at" integer
    )`,

    `CREATE TABLE IF NOT EXISTS "meeting_notes" (
      "id" text PRIMARY KEY,
      "title" text NOT NULL,
      "meeting_date" integer NOT NULL,
      "strategy_id" text NOT NULL,
      "selected_project_ids" text NOT NULL,
      "selected_action_ids" text NOT NULL,
      "notes" text NOT NULL,
      "organization_id" text,
      "created_by" text NOT NULL,
      "created_at" integer,
      "updated_at" integer
    )`,

    `CREATE TABLE IF NOT EXISTS "dependencies" (
      "id" text PRIMARY KEY,
      "source_type" text NOT NULL,
      "source_id" text NOT NULL,
      "target_type" text NOT NULL,
      "target_id" text NOT NULL,
      "relationship" text NOT NULL DEFAULT 'blocks',
      "organization_id" text,
      "created_by" text NOT NULL,
      "created_at" integer,
      UNIQUE("source_type", "source_id", "target_type", "target_id")
    )`,

    `CREATE TABLE IF NOT EXISTS "template_types" (
      "id" text PRIMARY KEY,
      "name" text NOT NULL UNIQUE,
      "display_order" integer NOT NULL DEFAULT 0,
      "created_at" integer
    )`,

    `CREATE TABLE IF NOT EXISTS "executive_goals" (
      "id" text PRIMARY KEY,
      "name" text NOT NULL,
      "description" text,
      "organization_id" text NOT NULL,
      "created_by" text NOT NULL,
      "created_at" integer
    )`,

    `CREATE TABLE IF NOT EXISTS "strategy_executive_goals" (
      "id" text PRIMARY KEY,
      "strategy_id" text NOT NULL,
      "executive_goal_id" text NOT NULL,
      "organization_id" text NOT NULL,
      UNIQUE("strategy_id", "executive_goal_id")
    )`,

    `CREATE TABLE IF NOT EXISTS "team_tags" (
      "id" text PRIMARY KEY,
      "name" text NOT NULL,
      "color_hex" text NOT NULL DEFAULT '#3B82F6',
      "organization_id" text NOT NULL,
      "created_by" text NOT NULL,
      "created_at" integer
    )`,

    `CREATE TABLE IF NOT EXISTS "project_team_tags" (
      "id" text PRIMARY KEY,
      "project_id" text NOT NULL,
      "team_tag_id" text NOT NULL,
      "organization_id" text NOT NULL,
      UNIQUE("project_id", "team_tag_id")
    )`,

    `CREATE TABLE IF NOT EXISTS "user_team_tags" (
      "id" text PRIMARY KEY,
      "user_id" text NOT NULL,
      "team_tag_id" text NOT NULL,
      "organization_id" text NOT NULL,
      "is_primary" integer NOT NULL DEFAULT 0,
      UNIQUE("user_id", "team_tag_id")
    )`,

    `CREATE TABLE IF NOT EXISTS "pto_entries" (
      "id" text PRIMARY KEY,
      "user_id" text NOT NULL,
      "start_date" text NOT NULL,
      "end_date" text NOT NULL,
      "type" text NOT NULL DEFAULT 'pto',
      "notes" text,
      "organization_id" text NOT NULL,
      "created_at" integer
    )`,

    `CREATE TABLE IF NOT EXISTS "holidays" (
      "id" text PRIMARY KEY,
      "name" text NOT NULL,
      "date" text NOT NULL,
      "organization_id" text NOT NULL,
      "created_at" integer
    )`,

    `CREATE TABLE IF NOT EXISTS "intake_forms" (
      "id" text PRIMARY KEY,
      "title" text NOT NULL,
      "description" text,
      "slug" text NOT NULL,
      "fields" text NOT NULL DEFAULT '[]',
      "is_active" text NOT NULL DEFAULT 'true',
      "expires_at" integer,
      "max_submissions_per_email" integer,
      "max_total_submissions" integer,
      "thank_you_message" text DEFAULT 'Thank you for your submission!',
      "default_strategy_id" text,
      "default_project_id" text,
      "organization_id" text NOT NULL,
      "created_by" text NOT NULL,
      "created_at" integer,
      "updated_at" integer,
      UNIQUE("organization_id", "slug")
    )`,

    `CREATE TABLE IF NOT EXISTS "intake_submissions" (
      "id" text PRIMARY KEY,
      "form_id" text NOT NULL,
      "data" text NOT NULL DEFAULT '{}',
      "submitter_email" text,
      "submitter_name" text,
      "status" text NOT NULL DEFAULT 'new',
      "assigned_strategy_id" text,
      "assigned_project_id" text,
      "reviewed_by" text,
      "reviewed_at" integer,
      "organization_id" text NOT NULL,
      "submitted_at" integer
    )`,

    `CREATE TABLE IF NOT EXISTS "report_out_decks" (
      "id" text PRIMARY KEY,
      "title" text NOT NULL,
      "report_date" integer NOT NULL,
      "organization_id" text NOT NULL,
      "created_by" text NOT NULL,
      "slides" text NOT NULL DEFAULT '[]',
      "snapshot_data" text NOT NULL DEFAULT '{}',
      "status" text NOT NULL DEFAULT 'draft',
      "created_at" integer,
      "updated_at" integer
    )`,

    `CREATE TABLE IF NOT EXISTS "decisions" (
      "id" text PRIMARY KEY,
      "organization_id" text NOT NULL,
      "title" text NOT NULL,
      "description" text,
      "category" text NOT NULL DEFAULT 'strategic',
      "status" text NOT NULL DEFAULT 'proposed',
      "escalation_level" text NOT NULL DEFAULT 'work_stream_lead',
      "outcome" text,
      "rationale" text,
      "impact_notes" text,
      "strategy_id" text,
      "due_date" integer,
      "decision_date" integer,
      "created_by" text NOT NULL,
      "created_at" integer,
      "updated_at" integer
    )`,

    `CREATE TABLE IF NOT EXISTS "decision_raci_assignments" (
      "id" text PRIMARY KEY,
      "decision_id" text NOT NULL,
      "user_id" text NOT NULL,
      "role" text NOT NULL,
      "created_at" integer,
      UNIQUE("decision_id", "user_id", "role")
    )`,

    `CREATE TABLE IF NOT EXISTS "workstreams" (
      "id" text PRIMARY KEY,
      "organization_id" text NOT NULL,
      "strategy_id" text NOT NULL,
      "name" text NOT NULL,
      "lead" text,
      "status" text NOT NULL DEFAULT 'active',
      "sort_order" integer NOT NULL DEFAULT 0,
      "created_at" integer,
      "updated_at" integer
    )`,

    `CREATE TABLE IF NOT EXISTS "phases" (
      "id" text PRIMARY KEY,
      "organization_id" text NOT NULL,
      "strategy_id" text NOT NULL,
      "name" text NOT NULL,
      "sequence" integer NOT NULL,
      "planned_start" integer,
      "planned_end" integer,
      "created_at" integer,
      "updated_at" integer
    )`,

    `CREATE TABLE IF NOT EXISTS "workstream_tasks" (
      "id" text PRIMARY KEY,
      "organization_id" text NOT NULL,
      "workstream_id" text NOT NULL,
      "phase_id" text NOT NULL,
      "name" text NOT NULL,
      "description" text,
      "owner" text,
      "planned_start" integer,
      "planned_end" integer,
      "actual_start" integer,
      "actual_end" integer,
      "duration_days" integer NOT NULL DEFAULT 1,
      "percent_complete" integer NOT NULL DEFAULT 0,
      "status" text NOT NULL DEFAULT 'not_started',
      "is_milestone" text NOT NULL DEFAULT 'false',
      "milestone_type" text,
      "sort_order" integer NOT NULL DEFAULT 0,
      "is_critical" text NOT NULL DEFAULT 'false',
      "early_start" integer,
      "early_end" integer,
      "late_start" integer,
      "late_end" integer,
      "total_float" integer,
      "created_at" integer,
      "updated_at" integer
    )`,

    `CREATE TABLE IF NOT EXISTS "workstream_dependencies" (
      "id" text PRIMARY KEY,
      "predecessor_task_id" text NOT NULL,
      "successor_task_id" text NOT NULL,
      "type" text NOT NULL DEFAULT 'FS',
      "lag_days" integer NOT NULL DEFAULT 0,
      "created_at" integer,
      UNIQUE("predecessor_task_id", "successor_task_id")
    )`,

    `CREATE TABLE IF NOT EXISTS "gate_criteria" (
      "id" text PRIMARY KEY,
      "gate_task_id" text NOT NULL,
      "description" text NOT NULL,
      "is_met" text NOT NULL DEFAULT 'false',
      "evidence" text,
      "owner" text,
      "created_at" integer,
      "updated_at" integer
    )`,
  ];
}
