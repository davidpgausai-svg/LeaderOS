import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, jsonb, index } from "drizzle-orm/pg-core";
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
  role: text("role").notNull().default('co_lead'), // 'administrator', 'co_lead', or 'view'
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
});

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
  progress: integer("progress").notNull().default(0), // 0-100, auto-calculated from tactics
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

export const tactics = pgTable("tactics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(), // Component 2: Tactic name
  description: text("description").notNull(), // Component 3: Tactic description
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
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const activities = pgTable("activities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(), // 'strategy_created', 'tactic_completed', 'tactic_overdue', etc.
  description: text("description").notNull(),
  userId: varchar("user_id").notNull(),
  strategyId: varchar("strategy_id"),
  tacticId: varchar("tactic_id"),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const outcomes = pgTable("outcomes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  strategyId: varchar("strategy_id").notNull(),
  tacticId: varchar("tactic_id"), // Optional - outcomes can be linked to tactics
  targetValue: text("target_value"),
  currentValue: text("current_value"),
  measurementUnit: text("measurement_unit"),
  status: text("status").notNull().default('in_progress'), // 'in_progress', 'achieved', 'at_risk', 'not_started'
  dueDate: timestamp("due_date"),
  isArchived: text("is_archived").notNull().default('false'), // 'true' or 'false' for cascade archival
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").default(sql`now()`),
});

// Outcome Documents - Links to external documents (OneDrive, Google Docs, etc.)
export const outcomeDocuments = pgTable("outcome_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  outcomeId: varchar("outcome_id").notNull(), // Action this document belongs to
  name: text("name").notNull(), // Display name for the document
  url: text("url").notNull(), // URL to the document
  createdAt: timestamp("created_at").default(sql`now()`),
});

// Outcome Checklist Items - Checklist for each action
export const outcomeChecklistItems = pgTable("outcome_checklist_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  outcomeId: varchar("outcome_id").notNull(), // Action this checklist item belongs to
  title: text("title").notNull(), // Checklist item description
  isCompleted: text("is_completed").notNull().default('false'), // 'true' or 'false'
  orderIndex: integer("order_index").notNull().default(0), // For sorting items
  createdAt: timestamp("created_at").default(sql`now()`),
});

// Change Continuum Milestones - 7 milestones per project
export const milestones = pgTable("milestones", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tacticId: varchar("tactic_id").notNull(), // Project this milestone belongs to
  milestoneNumber: integer("milestone_number").notNull(), // 1-7
  status: text("status").notNull().default('not_started'), // 'not_started', 'in_progress', 'completed'
  startDate: timestamp("start_date"),
  completionDate: timestamp("completion_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").default(sql`now()`),
});

// Communication Templates - Template URLs for each milestone
export const communicationTemplates = pgTable("communication_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tacticId: varchar("tactic_id").notNull(), // Project this template belongs to
  milestoneNumber: integer("milestone_number").notNull(), // 1-7, matches milestone
  templateUrl: text("template_url"),
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
  relatedEntityType: text("related_entity_type"), // Optional - 'strategy', 'tactic', 'outcome'
  isRead: text("is_read").notNull().default('false'), // 'true' or 'false'
  createdAt: timestamp("created_at").default(sql`now()`),
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
  // Make Change Continuum fields mandatory
  caseForChange: z.string().trim().min(1, "Case for Change is required"),
  visionStatement: z.string().trim().min(1, "Vision Statement is required"),
  successMetrics: z.string().trim().min(1, "Success Metrics is required"),
  stakeholderMap: z.string().trim().min(1, "Stakeholder Map is required"),
  readinessRating: z.string().trim().min(1, "Readiness Rating is required"),
  riskExposureRating: z.string().trim().min(1, "Risk Exposure Rating is required"),
  changeChampionAssignment: z.string().trim().min(1, "Change Champion Assignment is required"),
  reinforcementPlan: z.string().trim().min(1, "Reinforcement Plan is required"),
  benefitsRealizationPlan: z.string().trim().min(1, "Benefits Realization Plan is required"),
});

export const insertTacticSchema = createInsertSchema(tactics).omit({
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
});

export const insertActivitySchema = createInsertSchema(activities).omit({
  id: true,
  createdAt: true,
});

export const insertOutcomeSchema = createInsertSchema(outcomes).omit({
  id: true,
  createdAt: true,
}).extend({
  dueDate: z.coerce.date().optional(),
});

export const insertMilestoneSchema = createInsertSchema(milestones).omit({
  id: true,
  createdAt: true,
}).extend({
  startDate: z.coerce.date().optional(),
  completionDate: z.coerce.date().optional(),
});

export const insertCommunicationTemplateSchema = createInsertSchema(communicationTemplates).omit({
  id: true,
  createdAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const insertOutcomeDocumentSchema = createInsertSchema(outcomeDocuments).omit({
  id: true,
  createdAt: true,
});

export const insertOutcomeChecklistItemSchema = createInsertSchema(outcomeChecklistItems).omit({
  id: true,
  createdAt: true,
});

export const insertUserStrategyAssignmentSchema = createInsertSchema(userStrategyAssignments).omit({
  id: true,
  assignedAt: true,
});

export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertStrategy = z.infer<typeof insertStrategySchema>;
export type Strategy = typeof strategies.$inferSelect;
export type InsertTactic = z.infer<typeof insertTacticSchema>;
export type Tactic = typeof tactics.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Activity = typeof activities.$inferSelect;
export type InsertOutcome = z.infer<typeof insertOutcomeSchema>;
export type Outcome = typeof outcomes.$inferSelect;
export type InsertMilestone = z.infer<typeof insertMilestoneSchema>;
export type Milestone = typeof milestones.$inferSelect;
export type InsertCommunicationTemplate = z.infer<typeof insertCommunicationTemplateSchema>;
export type CommunicationTemplate = typeof communicationTemplates.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertOutcomeDocument = z.infer<typeof insertOutcomeDocumentSchema>;
export type OutcomeDocument = typeof outcomeDocuments.$inferSelect;
export type InsertOutcomeChecklistItem = z.infer<typeof insertOutcomeChecklistItemSchema>;
export type OutcomeChecklistItem = typeof outcomeChecklistItems.$inferSelect;
export type InsertUserStrategyAssignment = z.infer<typeof insertUserStrategyAssignmentSchema>;
export type UserStrategyAssignment = typeof userStrategyAssignments.$inferSelect;
