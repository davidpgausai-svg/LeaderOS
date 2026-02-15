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

export const meetingNotes = sqliteTable("meeting_notes", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  title: text("title").notNull(),
  meetingDate: integer("meeting_date", { mode: "timestamp" }).notNull(),
  strategyId: text("strategy_id").notNull(),
  selectedProjectIds: text("selected_project_ids").notNull(),
  selectedActionIds: text("selected_action_ids").notNull(),
  notes: text("notes").notNull(),
  organizationId: text("organization_id"),
  createdBy: text("created_by").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
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
});

export const insertActivitySchema = createInsertSchema(activities).omit({
  id: true,
  createdAt: true,
});

export const insertActionSchema = createInsertSchema(actions).omit({
  id: true,
  createdAt: true,
}).extend({
  dueDate: z.coerce.date().optional(),
  documentFolderUrl: z.string().url("Invalid document folder URL format").nullable().optional().or(z.literal('')).transform(val => val || null),
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

export const insertMeetingNoteSchema = createInsertSchema(meetingNotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  meetingDate: z.coerce.date(),
  selectedProjectIds: z.string().transform((str) => {
    try {
      return JSON.stringify(JSON.parse(str));
    } catch {
      return JSON.stringify([]);
    }
  }),
  selectedActionIds: z.string().transform((str) => {
    try {
      return JSON.stringify(JSON.parse(str));
    } catch {
      return JSON.stringify([]);
    }
  }),
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
export type InsertMeetingNote = z.infer<typeof insertMeetingNoteSchema>;
export type MeetingNote = typeof meetingNotes.$inferSelect;
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

export const intakeForms = sqliteTable("intake_forms", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  organizationId: text("organization_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  slug: text("slug").notNull(),
  fields: text("fields").notNull().default("[]"),
  status: text("status").notNull().default('active'),
  expiresAt: integer("expires_at", { mode: "timestamp" }),
  thankYouMessage: text("thank_you_message"),
  maxSubmissionsPerEmail: integer("max_submissions_per_email"),
  maxTotalSubmissions: integer("max_total_submissions"),
  requireEmail: text("require_email").notNull().default('true'),
  defaultStrategyId: text("default_strategy_id"),
  defaultProjectId: text("default_project_id"),
  createdBy: text("created_by").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
}, (table) => ({
  uniqueOrgSlug: unique().on(table.organizationId, table.slug),
}));

export const insertIntakeFormSchema = createInsertSchema(intakeForms).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  organizationId: true,
}).extend({
  expiresAt: z.coerce.date().optional().nullable(),
  maxSubmissionsPerEmail: z.number().int().min(1).optional().nullable(),
  maxTotalSubmissions: z.number().int().min(1).optional().nullable(),
  defaultStrategyId: z.string().optional().nullable(),
  defaultProjectId: z.string().optional().nullable(),
});

export type InsertIntakeForm = z.infer<typeof insertIntakeFormSchema>;
export type IntakeForm = typeof intakeForms.$inferSelect;

export const intakeSubmissions = sqliteTable("intake_submissions", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  formId: text("form_id").notNull(),
  organizationId: text("organization_id").notNull(),
  data: text("data").notNull().default("{}"),
  submitterEmail: text("submitter_email"),
  submitterName: text("submitter_name"),
  status: text("status").notNull().default('new'),
  assignedStrategyId: text("assigned_strategy_id"),
  assignedProjectId: text("assigned_project_id"),
  assignedActionId: text("assigned_action_id"),
  reviewedBy: text("reviewed_by"),
  reviewedAt: integer("reviewed_at", { mode: "timestamp" }),
  submittedAt: integer("submitted_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const insertIntakeSubmissionSchema = createInsertSchema(intakeSubmissions).omit({
  id: true,
  submittedAt: true,
  reviewedBy: true,
  reviewedAt: true,
  assignedStrategyId: true,
  assignedProjectId: true,
  assignedActionId: true,
  status: true,
});

export type InsertIntakeSubmission = z.infer<typeof insertIntakeSubmissionSchema>;
export type IntakeSubmission = typeof intakeSubmissions.$inferSelect;

export const reportOutDecks = sqliteTable("report_out_decks", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  title: text("title").notNull(),
  reportDate: integer("report_date", { mode: "timestamp" }).notNull(),
  organizationId: text("organization_id").notNull(),
  createdBy: text("created_by").notNull(),
  slides: text("slides").notNull().default("[]"),
  snapshotData: text("snapshot_data").notNull().default("{}"),
  status: text("status").notNull().default('draft'),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const insertReportOutDeckSchema = createInsertSchema(reportOutDecks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  organizationId: true,
}).extend({
  reportDate: z.coerce.date(),
  slides: z.string().optional().default("[]"),
  snapshotData: z.string().optional().default("{}"),
  status: z.enum(['draft', 'finalized']).optional().default('draft'),
});

export type InsertReportOutDeck = z.infer<typeof insertReportOutDeckSchema>;
export type ReportOutDeck = typeof reportOutDecks.$inferSelect;
