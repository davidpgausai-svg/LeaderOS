import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, jsonb, index, unique, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Subscription plan types
export const subscriptionPlanEnum = ['starter', 'leaderpro', 'team', 'legacy'] as const;
export type SubscriptionPlan = typeof subscriptionPlanEnum[number];

export const subscriptionStatusEnum = ['active', 'trialing', 'past_due', 'canceled', 'suspended'] as const;
export type SubscriptionStatus = typeof subscriptionStatusEnum[number];

export const billingIntervalEnum = ['monthly', 'annual'] as const;
export type BillingInterval = typeof billingIntervalEnum[number];

// Organizations table for multi-tenancy with subscription info
export const organizations = pgTable("organizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  registrationToken: text("registration_token").notNull().unique(),
  subscriptionPlan: text("subscription_plan").notNull().default('starter'),
  subscriptionStatus: text("subscription_status").notNull().default('active'),
  billingInterval: text("billing_interval").notNull().default('monthly'),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id").unique(),
  stripePriceId: text("stripe_price_id"),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  trialEndsAt: timestamp("trial_ends_at"),
  cancelAtPeriodEnd: text("cancel_at_period_end").notNull().default('false'),
  pendingDowngradePlan: text("pending_downgrade_plan"),
  maxUsers: integer("max_users").notNull().default(1),
  extraSeats: integer("extra_seats").notNull().default(0),
  pendingExtraSeats: integer("pending_extra_seats"),
  isLegacy: text("is_legacy").notNull().default('false'),
  paymentFailedAt: timestamp("payment_failed_at"),
  lastPaymentReminderAt: timestamp("last_payment_reminder_at"),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type Organization = typeof organizations.$inferSelect;

// Billing History - Track all billing events
export const billingHistory = pgTable("billing_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull(),
  eventType: text("event_type").notNull(),
  description: text("description").notNull(),
  amountCents: integer("amount_cents"),
  currency: text("currency").default('usd'),
  stripeInvoiceId: text("stripe_invoice_id"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  planBefore: text("plan_before"),
  planAfter: text("plan_after"),
  seatsBefore: integer("seats_before"),
  seatsAfter: integer("seats_after"),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const insertBillingHistorySchema = createInsertSchema(billingHistory).omit({
  id: true,
  createdAt: true,
});

export type InsertBillingHistory = z.infer<typeof insertBillingHistorySchema>;
export type BillingHistory = typeof billingHistory.$inferSelect;

// Payment Failures - Track failed payments and retry attempts
export const paymentFailures = pgTable("payment_failures", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull(),
  stripeInvoiceId: text("stripe_invoice_id"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  amountCents: integer("amount_cents").notNull(),
  currency: text("currency").default('usd'),
  failureReason: text("failure_reason"),
  remindersSent: integer("reminders_sent").notNull().default(0),
  lastReminderAt: timestamp("last_reminder_at"),
  gracePeriodEndsAt: timestamp("grace_period_ends_at").notNull(),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const insertPaymentFailureSchema = createInsertSchema(paymentFailures).omit({
  id: true,
  createdAt: true,
  remindersSent: true,
});

export type InsertPaymentFailure = z.infer<typeof insertPaymentFailureSchema>;
export type PaymentFailure = typeof paymentFailures.$inferSelect;

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
  passwordHash: text("password_hash"), // For email/password authentication
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: text("role").notNull().default('co_lead'), // 'administrator', 'co_lead', 'view', or 'sme'
  timezone: varchar("timezone").default('America/Chicago'), // User's timezone (e.g., 'America/Chicago', 'America/New_York')
  organizationId: varchar("organization_id"), // Foreign key to organizations table
  isSuperAdmin: text("is_super_admin").notNull().default('false'), // 'true' or 'false' - Super Admin can manage all organizations
  fte: text("fte").default('1.0'), // Full-time equivalent (1.0 = 40 hours/week, 0.5 = 20 hours/week)
  salary: integer("salary"), // Annual salary for cost calculations (nullable for future use)
  serviceDeliveryHours: text("service_delivery_hours").default('0'), // Hours for individual contributor work, meetings, etc.
  twoFactorEnabled: text("two_factor_enabled").notNull().default('false'), // 'true' or 'false' - 2FA via email
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Password Reset Tokens for email-based password recovery
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  tokenHash: text("token_hash").notNull(), // Hashed token for security
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"), // Null if not used yet
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({
  id: true,
  createdAt: true,
});

export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

// Two-Factor Authentication Codes for email-based 2FA
export const twoFactorCodes = pgTable("two_factor_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  codeHash: text("code_hash").notNull(), // Hashed 6-digit code for security
  type: text("type").notNull().default('login'), // 'login' or 'setup' - purpose of the code
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"), // Null if not used yet
  attempts: integer("attempts").notNull().default(0), // Track failed attempts for rate limiting
  organizationId: varchar("organization_id"), // For multi-tenancy
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const insertTwoFactorCodeSchema = createInsertSchema(twoFactorCodes).omit({
  id: true,
  createdAt: true,
  attempts: true,
});

export type InsertTwoFactorCode = z.infer<typeof insertTwoFactorCodeSchema>;
export type TwoFactorCode = typeof twoFactorCodes.$inferSelect;

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

// Project Resource Assignments - Links users to projects with hours per week for capacity planning
export const projectResourceAssignments = pgTable("project_resource_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull(), // Project being assigned to
  userId: varchar("user_id").notNull(), // User being assigned
  hoursPerWeek: text("hours_per_week").notNull().default('0'), // Hours per week assigned to this project
  organizationId: varchar("organization_id").notNull(), // For multi-tenancy
  assignedBy: varchar("assigned_by").notNull(), // User who made the assignment
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
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

// Action People Assignments - Links users to actions for to-do list tracking (no hours/FTE)
export const actionPeopleAssignments = pgTable("action_people_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  actionId: varchar("action_id").notNull(),
  userId: varchar("user_id").notNull(),
  organizationId: varchar("organization_id").notNull(),
  assignedBy: varchar("assigned_by").notNull(),
  createdAt: timestamp("created_at").default(sql`now()`),
}, (table) => ({
  uniqueActionUser: unique().on(table.actionId, table.userId),
}));

export const insertActionPeopleAssignmentSchema = createInsertSchema(actionPeopleAssignments).omit({
  id: true,
  createdAt: true,
});

export type InsertActionPeopleAssignment = z.infer<typeof insertActionPeopleAssignmentSchema>;
export type ActionPeopleAssignment = typeof actionPeopleAssignments.$inferSelect;

export const strategies = pgTable("strategies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  goal: text("goal"), // Strategic goal statement
  startDate: timestamp("start_date"), // Optional - derived from child projects on Timeline
  targetDate: timestamp("target_date"), // Optional - derived from child projects on Timeline
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
  organizationId: varchar("organization_id"), // Foreign key to organizations table
  executiveGoalId: varchar("executive_goal_id"), // Foreign key to executive_goals table for tagging
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(), // Component 2: Project name
  description: text("description").notNull(), // Component 3: Project description
  strategyId: varchar("strategy_id").notNull(), // Component 1: Strategy it is linked to
  kpi: text("kpi"), // Component 4: Key Performance Indicator (optional)
  kpiTracking: text("kpi_tracking"), // Component 5: Tracking the KPI (current value/measurement)
  accountableLeaders: text("accountable_leaders").notNull(), // Component 6: Accountable Leaders (JSON array of user IDs)
  resourcesRequired: text("resources_required"), // Component 7: Resources Required (open text field)
  startDate: timestamp("start_date").notNull(), // Component 8: Timeline - Start Date
  dueDate: timestamp("due_date").notNull(), // Component 8: Timeline - End Date
  status: text("status").notNull().default('NYS'), // Component 9: Status (C, OT, OH, B, NYS)
  completionDate: timestamp("completion_date"), // When project status was set to 'C' (Complete)
  progress: integer("progress").notNull().default(0), // 0-100
  isArchived: text("is_archived").notNull().default('false'), // 'true' or 'false' for cascade archival
  documentFolderUrl: text("document_folder_url"), // OneDrive/Google Drive URL for project documents
  communicationUrl: text("communication_url"), // Custom communication template URL
  organizationId: varchar("organization_id"), // Foreign key to organizations table
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
  organizationId: varchar("organization_id"), // Foreign key to organizations table
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
  organizationId: varchar("organization_id"), // Foreign key to organizations table
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
  achievedDate: timestamp("achieved_date"), // When action status was set to 'achieved'
  dueDate: timestamp("due_date"),
  isArchived: text("is_archived").notNull().default('false'), // 'true' or 'false' for cascade archival
  documentFolderUrl: text("document_folder_url"), // External folder URL (ClickUp, OneDrive, etc.)
  notes: text("notes"), // User notes for the action
  organizationId: varchar("organization_id"), // Foreign key to organizations table
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
  indentLevel: integer("indent_level").notNull().default(1), // 1 = bold, 2 = regular, 3 = lowercase
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
  organizationId: varchar("organization_id"), // Foreign key to organizations table
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
  organizationId: varchar("organization_id"), // Foreign key to organizations table
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
  startDate: z.coerce.date().optional().nullable(),
  targetDate: z.coerce.date().optional().nullable(),
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
  organizationId: varchar("organization_id"), // Foreign key to organizations table
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").default(sql`now()`),
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

// Executive Goals - Organization-level tags for strategic planning
export const executiveGoals = pgTable("executive_goals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  organizationId: varchar("organization_id").notNull(),
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const insertExecutiveGoalSchema = createInsertSchema(executiveGoals).omit({
  id: true,
  createdAt: true,
  createdBy: true,
  organizationId: true,
});

export type InsertExecutiveGoal = z.infer<typeof insertExecutiveGoalSchema>;
export type ExecutiveGoal = typeof executiveGoals.$inferSelect;

// Strategy Executive Goals - Junction table for many-to-many relationship
export const strategyExecutiveGoals = pgTable("strategy_executive_goals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  strategyId: varchar("strategy_id").notNull(),
  executiveGoalId: varchar("executive_goal_id").notNull(),
  organizationId: varchar("organization_id").notNull(),
  createdAt: timestamp("created_at").default(sql`now()`),
}, (table) => ({
  uniqueStrategyGoal: unique().on(table.strategyId, table.executiveGoalId),
}));

export const insertStrategyExecutiveGoalSchema = createInsertSchema(strategyExecutiveGoals).omit({
  id: true,
  createdAt: true,
});

export type InsertStrategyExecutiveGoal = z.infer<typeof insertStrategyExecutiveGoalSchema>;
export type StrategyExecutiveGoal = typeof strategyExecutiveGoals.$inferSelect;

// Team Tags - Organization-level team labels for projects
export const teamTags = pgTable("team_tags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  colorHex: text("color_hex").notNull().default('#3B82F6'),
  organizationId: varchar("organization_id").notNull(),
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const insertTeamTagSchema = createInsertSchema(teamTags).omit({
  id: true,
  createdAt: true,
  createdBy: true,
  organizationId: true,
});

export type InsertTeamTag = z.infer<typeof insertTeamTagSchema>;
export type TeamTag = typeof teamTags.$inferSelect;

// Project Team Tags - Junction table for many-to-many relationship between projects and team tags
export const projectTeamTags = pgTable("project_team_tags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull(),
  teamTagId: varchar("team_tag_id").notNull(),
  organizationId: varchar("organization_id").notNull(),
  createdAt: timestamp("created_at").default(sql`now()`),
}, (table) => ({
  uniqueProjectTag: unique().on(table.projectId, table.teamTagId),
}));

export const insertProjectTeamTagSchema = createInsertSchema(projectTeamTags).omit({
  id: true,
  createdAt: true,
});

export type InsertProjectTeamTag = z.infer<typeof insertProjectTeamTagSchema>;
export type ProjectTeamTag = typeof projectTeamTags.$inferSelect;

// PTO Entries - Track time off for users
export const ptoEntries = pgTable("pto_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  organizationId: varchar("organization_id").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").default(sql`now()`),
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

// Holidays - Organization-wide holidays
export const holidays = pgTable("holidays", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull(),
  date: timestamp("date").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").default(sql`now()`),
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
