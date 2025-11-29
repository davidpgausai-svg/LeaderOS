import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, jsonb, index, unique, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: text("role").notNull().default('co_lead'), // 'administrator', 'co_lead', 'view', or 'sme'
  timezone: varchar("timezone").default('America/Chicago'), // User's timezone (e.g., 'America/Chicago', 'America/New_York')
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User Strategy Assignments - Links users to strategies they can access
export const userStrategyAssignments = pgTable("user_strategy_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(), // User being assigned
  strategyId: varchar("strategy_id").notNull(), // Strategy they can access
  assignedBy: varchar("assigned_by").notNull(), // Administrator who made the assignment
  assignedAt: timestamp("assigned_at").default(sql`now()`),
}, (table) => ({
  uniqueUserStrategy: unique().on(table.userId, table.strategyId),
}));

export const strategies = pgTable("strategies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  goal: text("goal"), // Strategic goal statement
  startDate: timestamp("start_date").notNull(),
  targetDate: timestamp("target_date").notNull(),
  metrics: text("metrics").notNull(),
  status: text("status").notNull().default('Active'), // 'Active', 'Completed', 'Archived'
  completionDate: timestamp("completion_date"),
  colorCode: text("color_code").notNull().default('#3B82F6'), // Hex color for strategy grouping
  displayOrder: integer("display_order").notNull().default(0), // Order for framework ranking
  progress: integer("progress").notNull().default(0), // 0-100, auto-calculated from projects
  // Change Continuum fields - specific framework fields
  caseForChange: text("case_for_change").notNull().default("To be defined"),
  visionStatement: text("vision_statement").notNull().default("To be defined"),
  successMetrics: text("success_metrics").notNull().default("To be defined"),
  stakeholderMap: text("stakeholder_map").notNull().default("To be defined"),
  readinessRating: text("readiness_rating").notNull().default("To be defined"), // RAG (Red/Amber/Green)
  riskExposureRating: text("risk_exposure_rating").notNull().default("To be defined"),
  changeChampionAssignment: text("change_champion_assignment").notNull().default("To be defined"),
  reinforcementPlan: text("reinforcement_plan").notNull().default("To be defined"),
  benefitsRealizationPlan: text("benefits_realization_plan").notNull().default("To be defined"),
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(), // Component 2: Project name
  description: text("description").notNull(), // Component 3: Project description
  strategyId: varchar("strategy_id").notNull(), // Component 1: Strategy it is linked to
  kpi: text("kpi").notNull(), // Component 4: Key Performance Indicator
  kpiTracking: text("kpi_tracking"), // Component 5: Tracking the KPI (current value/measurement)
  accountableLeaders: text("accountable_leaders").notNull(), // Component 6: Accountable Leaders (JSON array of user IDs)
  resourcesRequired: text("resources_required"), // Component 7: Resources Required (open text field)
  startDate: timestamp("start_date").notNull(), // Component 8: Timeline - Start Date
  dueDate: timestamp("due_date").notNull(), // Component 8: Timeline - End Date
  status: text("status").notNull().default('NYS'), // Component 9: Status (C, OT, OH, B, NYS)
  progress: integer("progress").notNull().default(0), // 0-100
  isArchived: text("is_archived").notNull().default('false'), // 'true' or 'false' for cascade archival
  documentFolderUrl: text("document_folder_url"), // OneDrive/Google Drive URL for project documents
  communicationUrl: text("communication_url"), // Custom communication template URL
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").default(sql`now()`),
});

// Barriers - Risk and obstacle tracking at the project level
export const barriers = pgTable("barriers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull(), // Project this barrier belongs to
  title: text("title").notNull(), // Short summary of the barrier
  description: text("description").notNull(), // Detailed description of the barrier
  severity: text("severity").notNull().default('medium'), // 'low', 'medium', 'high'
  status: text("status").notNull().default('active'), // 'active', 'mitigated', 'resolved', 'closed'
  ownerId: varchar("owner_id"), // User responsible for resolving this barrier
  identifiedDate: timestamp("identified_date").default(sql`now()`), // When the barrier was identified
  targetResolutionDate: timestamp("target_resolution_date"), // When it should be resolved by
  resolutionDate: timestamp("resolution_date"), // When it was actually resolved
  resolutionNotes: text("resolution_notes"), // How the barrier was resolved
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

export const activities = pgTable("activities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(), // 'strategy_created', 'project_completed', 'project_overdue', etc.
  description: text("description").notNull(),
  userId: varchar("user_id").notNull(),
  strategyId: varchar("strategy_id"),
  projectId: varchar("project_id"),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const actions = pgTable("actions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  strategyId: varchar("strategy_id").notNull(),
  projectId: varchar("project_id"), // Optional - actions can be linked to projects
  targetValue: text("target_value"),
  currentValue: text("current_value"),
  measurementUnit: text("measurement_unit"),
  status: text("status").notNull().default('in_progress'), // 'in_progress', 'achieved', 'at_risk', 'not_started'
  dueDate: timestamp("due_date"),
  isArchived: text("is_archived").notNull().default('false'), // 'true' or 'false' for cascade archival
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").default(sql`now()`),
});

// Action Documents - Links to external documents (OneDrive, Google Docs, etc.)
export const actionDocuments = pgTable("action_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  actionId: varchar("action_id").notNull(), // Action this document belongs to
  name: text("name").notNull(), // Display name for the document
  url: text("url").notNull(), // URL to the document
  createdAt: timestamp("created_at").default(sql`now()`),
});

// Action Checklist Items - Checklist for each action
export const actionChecklistItems = pgTable("action_checklist_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  actionId: varchar("action_id").notNull(), // Action this checklist item belongs to
  title: text("title").notNull(), // Checklist item description
  isCompleted: text("is_completed").notNull().default('false'), // 'true' or 'false'
  orderIndex: integer("order_index").notNull().default(0), // For sorting items
  createdAt: timestamp("created_at").default(sql`now()`),
});

// Notifications - User notifications for strategic planning events
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(), // User receiving the notification
  type: text("type").notNull(), // Type of notification (action_completed, progress_milestone, etc.)
  title: text("title").notNull(), // Short notification title
  message: text("message").notNull(), // Full notification message
  relatedEntityId: varchar("related_entity_id"), // Optional - ID of related strategy/tactic/outcome
  relatedEntityType: text("related_entity_type"), // Optional - 'strategy', 'project', 'action'
  isRead: text("is_read").notNull().default('false'), // 'true' or 'false'
  createdAt: timestamp("created_at").default(sql`now()`),
});

// Meeting Notes - Report-out meeting notes with dynamic strategy/project/action selection
export const meetingNotes = pgTable("meeting_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(), // Meeting title
  meetingDate: timestamp("meeting_date").notNull(), // When the meeting occurred
  strategyId: varchar("strategy_id").notNull(), // Strategy this meeting is about
  selectedProjectIds: text("selected_project_ids").notNull(), // JSON array of selected project IDs
  selectedActionIds: text("selected_action_ids").notNull(), // JSON array of selected action IDs
  notes: text("notes").notNull(), // Meeting notes content
  createdBy: varchar("created_by").notNull(), // User who created these notes
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
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
  startDate: z.coerce.date(),
  targetDate: z.coerce.date(),
  // Change Continuum fields - optional with default fallback to "To be defined"
  caseForChange: z.string().optional().transform(val => val?.trim() || "To be defined"),
  visionStatement: z.string().optional().transform(val => val?.trim() || "To be defined"),
  successMetrics: z.string().optional().transform(val => val?.trim() || "To be defined"),
  stakeholderMap: z.string().optional().transform(val => val?.trim() || "To be defined"),
  readinessRating: z.string().optional().transform(val => val?.trim() || "To be defined"),
  riskExposureRating: z.string().optional().transform(val => val?.trim() || "To be defined"),
  changeChampionAssignment: z.string().optional().transform(val => val?.trim() || "To be defined"),
  reinforcementPlan: z.string().optional().transform(val => val?.trim() || "To be defined"),
  benefitsRealizationPlan: z.string().optional().transform(val => val?.trim() || "To be defined"),
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  progress: true, // Progress is auto-calculated, not user-provided
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
  communicationUrl: z.string().nullable().optional(),
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
}).extend({
  targetResolutionDate: z.coerce.date().optional().nullable(),
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
export type InsertUserStrategyAssignment = z.infer<typeof insertUserStrategyAssignmentSchema>;
export type UserStrategyAssignment = typeof userStrategyAssignments.$inferSelect;
export type InsertMeetingNote = z.infer<typeof insertMeetingNoteSchema>;
export type MeetingNote = typeof meetingNotes.$inferSelect;
export type InsertBarrier = z.infer<typeof insertBarrierSchema>;
export type Barrier = typeof barriers.$inferSelect;

// Dependencies - Track dependencies between projects and actions
export const dependencies = pgTable("dependencies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sourceType: text("source_type").notNull(), // 'project' or 'action'
  sourceId: varchar("source_id").notNull(), // ID of the project or action that has the dependency
  targetType: text("target_type").notNull(), // 'project' or 'action'
  targetId: varchar("target_id").notNull(), // ID of the project or action it depends on
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").default(sql`now()`),
}, (table) => ({
  uniqueDependency: unique().on(table.sourceType, table.sourceId, table.targetType, table.targetId),
}));

export const insertDependencySchema = createInsertSchema(dependencies).omit({
  id: true,
  createdAt: true,
  createdBy: true,
});

export type InsertDependency = z.infer<typeof insertDependencySchema>;
export type Dependency = typeof dependencies.$inferSelect;

// Template Types - Categories for template organization (admin-managed)
export const templateTypes = pgTable("template_types", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(), // e.g., "Strategic Planning", "Project Management", "Daily Tasks"
  description: text("description"), // Optional description
  displayOrder: integer("display_order").notNull().default(0),
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const insertTemplateTypeSchema = createInsertSchema(templateTypes).omit({
  id: true,
  createdAt: true,
});

export type InsertTemplateType = z.infer<typeof insertTemplateTypeSchema>;
export type TemplateType = typeof templateTypes.$inferSelect;

// AI Chat Conversations - Stores chat history with the AI assistant
export const aiChatConversations = pgTable("ai_chat_conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  message: text("message").notNull(),
  role: text("role").notNull(), // 'user' or 'assistant'
  context: jsonb("context"), // Page, role, strategies, etc.
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const insertAiChatConversationSchema = createInsertSchema(aiChatConversations).omit({
  id: true,
  createdAt: true,
});

export type InsertAiChatConversation = z.infer<typeof insertAiChatConversationSchema>;
export type AiChatConversation = typeof aiChatConversations.$inferSelect;
