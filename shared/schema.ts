import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  name: text("name").notNull(),
  role: text("role").notNull(), // 'administrator', 'executive', or 'leader'
  initials: text("initials").notNull(),
});

export const strategies = pgTable("strategies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  startDate: timestamp("start_date").notNull(),
  targetDate: timestamp("target_date").notNull(),
  metrics: text("metrics").notNull(),
  status: text("status").notNull().default('active'), // 'active', 'completed', 'on-hold'
  colorCode: text("color_code").notNull().default('#3B82F6'), // Hex color for strategy grouping
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

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
});

export const insertStrategySchema = createInsertSchema(strategies).omit({
  id: true,
  createdAt: true,
}).extend({
  startDate: z.coerce.date(),
  targetDate: z.coerce.date(),
});

export const insertTacticSchema = createInsertSchema(tactics).omit({
  id: true,
  createdAt: true,
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

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertStrategy = z.infer<typeof insertStrategySchema>;
export type Strategy = typeof strategies.$inferSelect;
export type InsertTactic = z.infer<typeof insertTacticSchema>;
export type Tactic = typeof tactics.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Activity = typeof activities.$inferSelect;
