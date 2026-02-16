import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, unique, index } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
const randomUUID = (): string => {
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const organizations = sqliteTable("organizations", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  name: text("name").notNull(),
  registrationToken: text("registration_token").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type Organization = typeof organizations.$inferSelect;

export const sessions = sqliteTable(
  "sessions",
  {
    sid: text("sid").primaryKey(),
    sess: text("sess", { mode: "json" }).notNull(),
    expire: integer("expire", { mode: "timestamp" }).notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

export const users = sqliteTable("users", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  email: text("email").unique(),
  passwordHash: text("password_hash"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  profileImageUrl: text("profile_image_url"),
  role: text("role").notNull().default('co_lead'),
  timezone: text("timezone").default('America/Chicago'),
  organizationId: text("organization_id"),
  isSuperAdmin: text("is_super_admin").notNull().default('false'),
  fte: text("fte").default('1.0'),
  salary: integer("salary"),
  serviceDeliveryHours: text("service_delivery_hours").default('0'),
  twoFactorEnabled: text("two_factor_enabled").notNull().default('false'),
  mustChangePassword: text("must_change_password").notNull().default('false'),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const passwordResetTokens = sqliteTable("password_reset_tokens", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  userId: text("user_id").notNull(),
  tokenHash: text("token_hash").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  usedAt: integer("used_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({
  id: true,
  createdAt: true,
});

export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

export const twoFactorCodes = sqliteTable("two_factor_codes", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  userId: text("user_id").notNull(),
  codeHash: text("code_hash").notNull(),
  type: text("type").notNull().default('login'),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  usedAt: integer("used_at", { mode: "timestamp" }),
  attempts: integer("attempts").notNull().default(0),
  organizationId: text("organization_id"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const insertTwoFactorCodeSchema = createInsertSchema(twoFactorCodes).omit({
  id: true,
  createdAt: true,
  attempts: true,
});

export type InsertTwoFactorCode = z.infer<typeof insertTwoFactorCodeSchema>;
export type TwoFactorCode = typeof twoFactorCodes.$inferSelect;

export const userStrategyAssignments = sqliteTable("user_strategy_assignments", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  userId: text("user_id").notNull(),
  strategyId: text("strategy_id").notNull(),
  assignedBy: text("assigned_by").notNull(),
  assignedAt: integer("assigned_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
}, (table) => ({
  uniqueUserStrategy: unique().on(table.userId, table.strategyId),
}));

export const projectResourceAssignments = sqliteTable("project_resource_assignments", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  projectId: text("project_id").notNull(),
  userId: text("user_id").notNull(),
  hoursPerWeek: text("hours_per_week").notNull().default('0'),
  organizationId: text("organization_id").notNull(),
  assignedBy: text("assigned_by").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
}, (table) => ({
  uniqueProjectUser: unique().on(table.projectId, table.userId),
}));

export const insertProjectResourceAssignmentSchema = createInsertSchema(projectResourceAssignments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProjectResourceAssignment = z.infer<typeof insertProjectResourceAssignmentSchema>;
export type ProjectResourceAssignment = typeof projectResourceAssignments.$inferSelect;

export const actionPeopleAssignments = sqliteTable("action_people_assignments", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  actionId: text("action_id").notNull(),
  userId: text("user_id").notNull(),
  organizationId: text("organization_id").notNull(),
  assignedBy: text("assigned_by").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
}, (table) => ({
  uniqueActionUser: unique().on(table.actionId, table.userId),
}));

export const insertActionPeopleAssignmentSchema = createInsertSchema(actionPeopleAssignments).omit({
  id: true,
  createdAt: true,
});

export type InsertActionPeopleAssignment = z.infer<typeof insertActionPeopleAssignmentSchema>;
export type ActionPeopleAssignment = typeof actionPeopleAssignments.$inferSelect;

export const strategies = sqliteTable("strategies", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  title: text("title").notNull(),
  description: text("description").notNull(),
  goal: text("goal"),
  startDate: integer("start_date", { mode: "timestamp" }),
  targetDate: integer("target_date", { mode: "timestamp" }),
  metrics: text("metrics").notNull(),
  status: text("status").notNull().default('Active'),
  completionDate: integer("completion_date", { mode: "timestamp" }),
  colorCode: text("color_code").notNull().default('#3B82F6'),
  displayOrder: integer("display_order").notNull().default(0),
  progress: integer("progress").notNull().default(0),
  caseForChange: text("case_for_change").notNull().default("To be defined"),
  visionStatement: text("vision_statement").notNull().default("To be defined"),
  successMetrics: text("success_metrics").notNull().default("To be defined"),
  stakeholderMap: text("stakeholder_map").notNull().default("To be defined"),
  readinessRating: text("readiness_rating").notNull().default("To be defined"),
  riskExposureRating: text("risk_exposure_rating").notNull().default("To be defined"),
  changeChampionAssignment: text("change_champion_assignment").notNull().default("To be defined"),
  reinforcementPlan: text("reinforcement_plan").notNull().default("To be defined"),
  benefitsRealizationPlan: text("benefits_realization_plan").notNull().default("To be defined"),
  hiddenContinuumSections: text("hidden_continuum_sections").default("[]"),
  customContinuumSections: text("custom_continuum_sections").default("[]"),
  organizationId: text("organization_id"),
  executiveGoalId: text("executive_goal_id"),
  createdBy: text("created_by").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  title: text("title").notNull(),
  description: text("description").notNull(),
  strategyId: text("strategy_id").notNull(),
  kpi: text("kpi"),
  kpiTracking: text("kpi_tracking"),
  accountableLeaders: text("accountable_leaders").notNull(),
  resourcesRequired: text("resources_required"),
  startDate: integer("start_date", { mode: "timestamp" }).notNull(),
  dueDate: integer("due_date", { mode: "timestamp" }).notNull(),
  status: text("status").notNull().default('NYS'),
  completionDate: integer("completion_date", { mode: "timestamp" }),
  progress: integer("progress").notNull().default(0),
  isArchived: text("is_archived").notNull().default('false'),
  archiveReason: text("archive_reason"),
  archivedAt: integer("archived_at", { mode: "timestamp" }),
  archivedBy: text("archived_by"),
  progressAtArchive: integer("progress_at_archive"),
  wakeUpDate: integer("wake_up_date", { mode: "timestamp" }),
  documentFolderUrl: text("document_folder_url"),
  communicationUrl: text("communication_url"),
  isWorkstream: text("is_workstream").notNull().default('false'),
  workstreamId: text("workstream_id"),
  organizationId: text("organization_id"),
  createdBy: text("created_by").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const projectSnapshots = sqliteTable("project_snapshots", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  projectId: text("project_id").notNull(),
  snapshotData: text("snapshot_data").notNull(),
  snapshotType: text("snapshot_type").notNull(),
  reason: text("reason"),
  createdBy: text("created_by").notNull(),
  organizationId: text("organization_id"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const barriers = sqliteTable("barriers", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  projectId: text("project_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  severity: text("severity").notNull().default('medium'),
  status: text("status").notNull().default('active'),
  ownerId: text("owner_id"),
  identifiedDate: integer("identified_date", { mode: "timestamp" }).$defaultFn(() => new Date()),
  targetResolutionDate: integer("target_resolution_date", { mode: "timestamp" }),
  resolutionDate: integer("resolution_date", { mode: "timestamp" }),
  resolutionNotes: text("resolution_notes"),
  organizationId: text("organization_id"),
  createdBy: text("created_by").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const activities = sqliteTable("activities", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  type: text("type").notNull(),
  description: text("description").notNull(),
  userId: text("user_id").notNull(),
  strategyId: text("strategy_id"),
  projectId: text("project_id"),
  organizationId: text("organization_id"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const actions = sqliteTable("actions", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  title: text("title").notNull(),
  description: text("description").notNull(),
  strategyId: text("strategy_id").notNull(),
  projectId: text("project_id"),
  targetValue: text("target_value"),
  currentValue: text("current_value"),
  measurementUnit: text("measurement_unit"),
  status: text("status").notNull().default('in_progress'),
  achievedDate: integer("achieved_date", { mode: "timestamp" }),
  dueDate: integer("due_date", { mode: "timestamp" }),
  isArchived: text("is_archived").notNull().default('false'),
  documentFolderUrl: text("document_folder_url"),
  notes: text("notes"),
  organizationId: text("organization_id"),
  createdBy: text("created_by").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  phaseId: text("phase_id"),
  workstreamId: text("workstream_id"),
  isMilestone: text("is_milestone").notNull().default("false"),
  milestoneType: text("milestone_type"),
  plannedStart: integer("planned_start", { mode: "timestamp" }),
  plannedEnd: integer("planned_end", { mode: "timestamp" }),
  actualStart: integer("actual_start", { mode: "timestamp" }),
  actualEnd: integer("actual_end", { mode: "timestamp" }),
  durationDays: integer("duration_days").notNull().default(1),
  percentComplete: integer("percent_complete").notNull().default(0),
  sortOrder: integer("sort_order").notNull().default(0),
  isCritical: text("is_critical").notNull().default("false"),
  earlyStart: integer("early_start", { mode: "timestamp" }),
  earlyEnd: integer("early_end", { mode: "timestamp" }),
  lateStart: integer("late_start", { mode: "timestamp" }),
  lateEnd: integer("late_end", { mode: "timestamp" }),
  totalFloat: integer("total_float"),
});

export const actionDocuments = sqliteTable("action_documents", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  actionId: text("action_id").notNull(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const actionChecklistItems = sqliteTable("action_checklist_items", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  actionId: text("action_id").notNull(),
  title: text("title").notNull(),
  isCompleted: text("is_completed").notNull().default('false'),
  orderIndex: integer("order_index").notNull().default(0),
  indentLevel: integer("indent_level").notNull().default(1),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const notifications = sqliteTable("notifications", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  userId: text("user_id").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  relatedEntityId: text("related_entity_id"),
  relatedEntityType: text("related_entity_type"),
  isRead: text("is_read").notNull().default('false'),
  organizationId: text("organization_id"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const upsertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStrategySchema = createInsertSchema(strategies).omit({
  id: true,
  createdAt: true,
}).extend({
  startDate: z.coerce.date().optional().nullable(),
  targetDate: z.coerce.date().optional().nullable(),
  caseForChange: z.string().optional().transform(val => val?.trim() || "To be defined"),
  visionStatement: z.string().optional().transform(val => val?.trim() || "To be defined"),
  successMetrics: z.string().optional().transform(val => val?.trim() || "To be defined"),
  stakeholderMap: z.string().optional().transform(val => val?.trim() || "To be defined"),
  readinessRating: z.string().optional().transform(val => val?.trim() || "To be defined"),
  riskExposureRating: z.string().optional().transform(val => val?.trim() || "To be defined"),
  changeChampionAssignment: z.string().optional().transform(val => val?.trim() || "To be defined"),
  reinforcementPlan: z.string().optional().transform(val => val?.trim() || "To be defined"),
  benefitsRealizationPlan: z.string().optional().transform(val => val?.trim() || "To be defined"),
  hiddenContinuumSections: z.string().optional().default("[]"),
  customContinuumSections: z.string().optional().default("[]"),
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  progress: true,
}).extend({
  startDate: z.coerce.date(),
  dueDate: z.coerce.date(),
  accountableLeaders: z.string().transform((str) => {
    try {
      return JSON.stringify(JSON.parse(str));
    } catch {
      return JSON.stringify([str]);
    }
  }),
  documentFolderUrl: z.string().url("Invalid document folder URL format").nullable().optional().or(z.literal('')).transform(val => val || null),
  communicationUrl: z.string().url("Invalid communication URL format").nullable().optional().or(z.literal('')).transform(val => val || null),
  isWorkstream: z.enum(["true", "false"]).default("false"),
  workstreamId: z.string().nullable().optional(),
});

export const insertActivitySchema = createInsertSchema(activities).omit({
  id: true,
  createdAt: true,
});

export const insertActionSchema = createInsertSchema(actions).omit({
  id: true,
  createdAt: true,
  isCritical: true,
  earlyStart: true,
  earlyEnd: true,
  lateStart: true,
  lateEnd: true,
  totalFloat: true,
}).extend({
  dueDate: z.coerce.date().optional(),
  documentFolderUrl: z.string().url("Invalid document folder URL format").nullable().optional().or(z.literal('')).transform(val => val || null),
  phaseId: z.string().nullable().optional(),
  workstreamId: z.string().nullable().optional(),
  isMilestone: z.enum(["true", "false"]).default("false"),
  milestoneType: z.enum(["workstream_gate", "program_gate"]).nullable().optional(),
  plannedStart: z.coerce.date().optional().nullable(),
  plannedEnd: z.coerce.date().optional().nullable(),
  actualStart: z.coerce.date().optional().nullable(),
  actualEnd: z.coerce.date().optional().nullable(),
  durationDays: z.number().int().default(1),
  percentComplete: z.number().int().min(0).max(100).default(0),
  sortOrder: z.number().int().default(0),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const insertActionDocumentSchema = createInsertSchema(actionDocuments).omit({
  id: true,
  createdAt: true,
});

export const insertActionChecklistItemSchema = createInsertSchema(actionChecklistItems).omit({
  id: true,
  createdAt: true,
  actionId: true,
});

export const insertUserStrategyAssignmentSchema = createInsertSchema(userStrategyAssignments).omit({
  id: true,
  assignedAt: true,
});

export const insertBarrierSchema = createInsertSchema(barriers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  identifiedDate: true,
  resolutionDate: true,
  createdBy: true,
  organizationId: true,
}).extend({
  targetResolutionDate: z.coerce.date().optional().nullable(),
});

export const insertProjectSnapshotSchema = createInsertSchema(projectSnapshots).omit({
  id: true,
  createdAt: true,
});

export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertStrategy = z.infer<typeof insertStrategySchema>;
export type Strategy = typeof strategies.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Activity = typeof activities.$inferSelect;
export type InsertAction = z.infer<typeof insertActionSchema>;
export type Action = typeof actions.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertActionDocument = z.infer<typeof insertActionDocumentSchema>;
export type ActionDocument = typeof actionDocuments.$inferSelect;
export type InsertActionChecklistItem = z.infer<typeof insertActionChecklistItemSchema>;
export type ActionChecklistItem = typeof actionChecklistItems.$inferSelect;
export type CreateActionChecklistItem = InsertActionChecklistItem & { actionId: string };
export type InsertUserStrategyAssignment = z.infer<typeof insertUserStrategyAssignmentSchema>;
export type UserStrategyAssignment = typeof userStrategyAssignments.$inferSelect;
export type InsertBarrier = z.infer<typeof insertBarrierSchema>;
export type Barrier = typeof barriers.$inferSelect;
export type InsertProjectSnapshot = z.infer<typeof insertProjectSnapshotSchema>;
export type ProjectSnapshot = typeof projectSnapshots.$inferSelect;

export const dependencies = sqliteTable("dependencies", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  sourceType: text("source_type").notNull(),
  sourceId: text("source_id").notNull(),
  targetType: text("target_type").notNull(),
  targetId: text("target_id").notNull(),
  organizationId: text("organization_id"),
  createdBy: text("created_by").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
}, (table) => ({
  uniqueDependency: unique().on(table.sourceType, table.sourceId, table.targetType, table.targetId),
}));

export const insertDependencySchema = createInsertSchema(dependencies).omit({
  id: true,
  createdAt: true,
  createdBy: true,
  organizationId: true,
});

export type InsertDependency = z.infer<typeof insertDependencySchema>;
export type Dependency = typeof dependencies.$inferSelect;

export const templateTypes = sqliteTable("template_types", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  name: text("name").notNull().unique(),
  description: text("description"),
  displayOrder: integer("display_order").notNull().default(0),
  createdBy: text("created_by").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const insertTemplateTypeSchema = createInsertSchema(templateTypes).omit({
  id: true,
  createdAt: true,
});

export type InsertTemplateType = z.infer<typeof insertTemplateTypeSchema>;
export type TemplateType = typeof templateTypes.$inferSelect;

export const executiveGoals = sqliteTable("executive_goals", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  name: text("name").notNull(),
  description: text("description"),
  organizationId: text("organization_id").notNull(),
  createdBy: text("created_by").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const insertExecutiveGoalSchema = createInsertSchema(executiveGoals).omit({
  id: true,
  createdAt: true,
  createdBy: true,
  organizationId: true,
});

export type InsertExecutiveGoal = z.infer<typeof insertExecutiveGoalSchema>;
export type ExecutiveGoal = typeof executiveGoals.$inferSelect;

export const strategyExecutiveGoals = sqliteTable("strategy_executive_goals", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  strategyId: text("strategy_id").notNull(),
  executiveGoalId: text("executive_goal_id").notNull(),
  organizationId: text("organization_id").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
}, (table) => ({
  uniqueStrategyGoal: unique().on(table.strategyId, table.executiveGoalId),
}));

export const insertStrategyExecutiveGoalSchema = createInsertSchema(strategyExecutiveGoals).omit({
  id: true,
  createdAt: true,
});

export type InsertStrategyExecutiveGoal = z.infer<typeof insertStrategyExecutiveGoalSchema>;
export type StrategyExecutiveGoal = typeof strategyExecutiveGoals.$inferSelect;

export const teamTags = sqliteTable("team_tags", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  name: text("name").notNull(),
  colorHex: text("color_hex").notNull().default('#3B82F6'),
  organizationId: text("organization_id").notNull(),
  createdBy: text("created_by").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const insertTeamTagSchema = createInsertSchema(teamTags).omit({
  id: true,
  createdAt: true,
  createdBy: true,
  organizationId: true,
});

export type InsertTeamTag = z.infer<typeof insertTeamTagSchema>;
export type TeamTag = typeof teamTags.$inferSelect;

export const projectTeamTags = sqliteTable("project_team_tags", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  projectId: text("project_id").notNull(),
  teamTagId: text("team_tag_id").notNull(),
  organizationId: text("organization_id").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
}, (table) => ({
  uniqueProjectTag: unique().on(table.projectId, table.teamTagId),
}));

export const insertProjectTeamTagSchema = createInsertSchema(projectTeamTags).omit({
  id: true,
  createdAt: true,
});

export type InsertProjectTeamTag = z.infer<typeof insertProjectTeamTagSchema>;
export type ProjectTeamTag = typeof projectTeamTags.$inferSelect;

export const userTeamTags = sqliteTable("user_team_tags", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  userId: text("user_id").notNull(),
  teamTagId: text("team_tag_id").notNull(),
  organizationId: text("organization_id").notNull(),
  isPrimary: integer("is_primary", { mode: "boolean" }).default(false).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
}, (table) => ({
  uniqueUserTag: unique().on(table.userId, table.teamTagId),
}));

export const insertUserTeamTagSchema = createInsertSchema(userTeamTags).omit({
  id: true,
  createdAt: true,
});

export type InsertUserTeamTag = z.infer<typeof insertUserTeamTagSchema>;
export type UserTeamTag = typeof userTeamTags.$inferSelect;

export const ptoEntries = sqliteTable("pto_entries", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  userId: text("user_id").notNull(),
  organizationId: text("organization_id").notNull(),
  startDate: integer("start_date", { mode: "timestamp" }).notNull(),
  endDate: integer("end_date", { mode: "timestamp" }).notNull(),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const insertPtoEntrySchema = createInsertSchema(ptoEntries).omit({
  id: true,
  createdAt: true,
  userId: true,
  organizationId: true,
}).extend({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

export type InsertPtoEntry = z.infer<typeof insertPtoEntrySchema>;
export type PtoEntry = typeof ptoEntries.$inferSelect;

export const holidays = sqliteTable("holidays", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  organizationId: text("organization_id").notNull(),
  date: integer("date", { mode: "timestamp" }).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const insertHolidaySchema = createInsertSchema(holidays).omit({
  id: true,
  createdAt: true,
  organizationId: true,
}).extend({
  date: z.coerce.date(),
  name: z.string().min(1, "Holiday name is required").max(255),
});

export type InsertHoliday = z.infer<typeof insertHolidaySchema>;
export type Holiday = typeof holidays.$inferSelect;

export const decisions = sqliteTable("decisions", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  organizationId: text("organization_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull().default("strategic"),
  status: text("status").notNull().default("proposed"),
  escalationLevel: text("escalation_level").notNull().default("work_stream_lead"),
  outcome: text("outcome"),
  rationale: text("rationale"),
  impactNotes: text("impact_notes"),
  strategyId: text("strategy_id"),
  dueDate: integer("due_date", { mode: "timestamp" }),
  decisionDate: integer("decision_date", { mode: "timestamp" }),
  createdBy: text("created_by").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const insertDecisionSchema = createInsertSchema(decisions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  organizationId: true,
}).extend({
  category: z.enum(["strategic", "technical", "process", "resource", "budget", "scope"]).default("strategic"),
  status: z.enum(["proposed", "under_review", "decided", "superseded"]).default("proposed"),
  escalationLevel: z.enum(["work_stream_lead", "work_stream", "steering_committee", "executive_committee"]).default("work_stream_lead"),
  dueDate: z.coerce.date().optional().nullable(),
  decisionDate: z.coerce.date().optional().nullable(),
});

export type InsertDecision = z.infer<typeof insertDecisionSchema>;
export type Decision = typeof decisions.$inferSelect;

export const decisionRaciAssignments = sqliteTable("decision_raci_assignments", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  decisionId: text("decision_id").notNull(),
  userId: text("user_id").notNull(),
  role: text("role").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
}, (table) => ({
  uniqueAssignment: unique().on(table.decisionId, table.userId, table.role),
}));

export const insertDecisionRaciSchema = createInsertSchema(decisionRaciAssignments).omit({
  id: true,
  createdAt: true,
}).extend({
  role: z.enum(["responsible", "accountable", "consulted", "informed"]),
});

export type InsertDecisionRaci = z.infer<typeof insertDecisionRaciSchema>;
export type DecisionRaci = typeof decisionRaciAssignments.$inferSelect;

export const workstreams = sqliteTable("workstreams", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  organizationId: text("organization_id").notNull(),
  strategyId: text("strategy_id").notNull(),
  name: text("name").notNull(),
  lead: text("lead"),
  status: text("status").notNull().default("active"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const insertWorkstreamSchema = createInsertSchema(workstreams).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  organizationId: true,
}).extend({
  status: z.enum(["active", "complete", "on_hold"]).default("active"),
});

export type InsertWorkstream = z.infer<typeof insertWorkstreamSchema>;
export type Workstream = typeof workstreams.$inferSelect;

export const phases = sqliteTable("phases", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  organizationId: text("organization_id").notNull(),
  strategyId: text("strategy_id").notNull(),
  name: text("name").notNull(),
  sequence: integer("sequence").notNull(),
  plannedStart: integer("planned_start", { mode: "timestamp" }),
  plannedEnd: integer("planned_end", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const insertPhaseSchema = createInsertSchema(phases).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  organizationId: true,
}).extend({
  plannedStart: z.coerce.date().optional().nullable(),
  plannedEnd: z.coerce.date().optional().nullable(),
});

export type InsertPhase = z.infer<typeof insertPhaseSchema>;
export type Phase = typeof phases.$inferSelect;

export const workstreamDependencies = sqliteTable("workstream_dependencies", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  predecessorTaskId: text("predecessor_task_id").notNull(),
  successorTaskId: text("successor_task_id").notNull(),
  type: text("type").notNull().default("FS"),
  lagDays: integer("lag_days").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
}, (table) => ({
  uniqueDep: unique().on(table.predecessorTaskId, table.successorTaskId),
}));

export const insertWorkstreamDependencySchema = createInsertSchema(workstreamDependencies).omit({
  id: true,
  createdAt: true,
}).extend({
  type: z.enum(["FS", "FF", "SS", "SF"]).default("FS"),
});

export type InsertWorkstreamDependency = z.infer<typeof insertWorkstreamDependencySchema>;
export type WorkstreamDependency = typeof workstreamDependencies.$inferSelect;

export const gateCriteria = sqliteTable("gate_criteria", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  gateTaskId: text("gate_task_id").notNull(),
  description: text("description").notNull(),
  isMet: text("is_met").notNull().default("false"),
  evidence: text("evidence"),
  owner: text("owner"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const insertGateCriteriaSchema = createInsertSchema(gateCriteria).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  isMet: z.enum(["true", "false"]).default("false"),
});

export type InsertGateCriteria = z.infer<typeof insertGateCriteriaSchema>;
export type GateCriteria = typeof gateCriteria.$inferSelect;
