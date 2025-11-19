import { type User, type UpsertUser, type InsertUser, type Strategy, type InsertStrategy, type Tactic, type InsertTactic, type Activity, type InsertActivity, type Outcome, type InsertOutcome, users, strategies, tactics, activities, outcomes } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, asc } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;

  // Strategy methods
  getStrategy(id: string): Promise<Strategy | undefined>;
  getAllStrategies(): Promise<Strategy[]>;
  getStrategiesByCreator(creatorId: string): Promise<Strategy[]>;
  createStrategy(strategy: InsertStrategy): Promise<Strategy>;
  updateStrategy(id: string, updates: Partial<Strategy>): Promise<Strategy | undefined>;
  deleteStrategy(id: string): Promise<boolean>;

  // Tactic methods
  getTactic(id: string): Promise<Tactic | undefined>;
  getAllTactics(): Promise<Tactic[]>;
  getTacticsByStrategy(strategyId: string): Promise<Tactic[]>;
  getTacticsByAssignee(assigneeId: string): Promise<Tactic[]>;
  createTactic(tactic: InsertTactic): Promise<Tactic>;
  updateTactic(id: string, updates: Partial<Tactic>): Promise<Tactic | undefined>;
  deleteTactic(id: string): Promise<boolean>;

  // Activity methods
  getActivity(id: string): Promise<Activity | undefined>;
  getAllActivities(): Promise<Activity[]>;
  getActivitiesByUser(userId: string): Promise<Activity[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;

  // Outcome methods
  getOutcome(id: string): Promise<Outcome | undefined>;
  getAllOutcomes(): Promise<Outcome[]>;
  getOutcomesByStrategy(strategyId: string): Promise<Outcome[]>;
  getOutcomesByTactic(tacticId: string): Promise<Outcome[]>;
  createOutcome(outcome: InsertOutcome): Promise<Outcome>;
  updateOutcome(id: string, updates: Partial<Outcome>): Promise<Outcome | undefined>;
  deleteOutcome(id: string): Promise<boolean>;

  // Progress recalculation methods
  recalculateTacticProgress(tacticId: string): Promise<void>;
  recalculateStrategyProgress(strategyId: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private strategies: Map<string, Strategy> = new Map();
  private tactics: Map<string, Tactic> = new Map();
  private activities: Map<string, Activity> = new Map();
  private outcomes: Map<string, Outcome> = new Map();

  constructor() {
    this.seedData();
  }

  private seedData() {
    // Create sample users
    const adminUser: User = {
      id: randomUUID(),
      email: "dpgaus@outlook.com",
      firstName: "David",
      lastName: "Gaus",
      profileImageUrl: null,
      role: "administrator",
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const executiveUser: User = {
      id: randomUUID(),
      email: "mike.wilson@example.com",
      firstName: "Mike",
      lastName: "Wilson",
      profileImageUrl: null,
      role: "executive",
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const leaderUser: User = {
      id: randomUUID(),
      email: "sarah.johnson@example.com",
      firstName: "Sarah",
      lastName: "Johnson",
      profileImageUrl: null,
      role: "leader",
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.users.set(adminUser.id, adminUser);
    this.users.set(executiveUser.id, executiveUser);
    this.users.set(leaderUser.id, leaderUser);

    // Create sample strategies
    const strategy1: Strategy = {
      id: randomUUID(),
      title: "Market Expansion Initiative",
      description: "Expand into new geographic markets to increase revenue by 25%",
      goal: "Increase revenue by 25% through geographic expansion",
      startDate: new Date("2024-01-01"),
      targetDate: new Date("2024-12-31"),
      metrics: "25% revenue increase, 3 new markets",
      status: "active",
      completionDate: null,
      colorCode: "#22C55E",
      displayOrder: 0,
      progress: 0,
      createdBy: adminUser.id,
      createdAt: new Date()
    };

    const strategy2: Strategy = {
      id: randomUUID(),
      title: "Digital Transformation",
      description: "Modernize core systems and improve operational efficiency",
      goal: "Achieve 50% efficiency improvement through modernization",
      startDate: new Date("2024-02-01"),
      targetDate: new Date("2024-10-31"),
      metrics: "50% efficiency improvement, 95% system uptime",
      status: "active",
      completionDate: null,
      colorCode: "#3B82F6",
      displayOrder: 1,
      progress: 0,
      createdBy: executiveUser.id,
      createdAt: new Date()
    };

    this.strategies.set(strategy1.id, strategy1);
    this.strategies.set(strategy2.id, strategy2);

    // Create sample tactics
    const tactic1: Tactic = {
      id: randomUUID(),
      title: "Market Research Analysis",
      description: "Conduct comprehensive market research for target regions",
      strategyId: strategy1.id,
      kpi: "Number of markets analyzed",
      kpiTracking: "3 out of 5 markets completed",
      accountableLeaders: JSON.stringify([leaderUser.id]),
      resourcesRequired: "Research team, market analysis tools, $50k budget",
      startDate: new Date("2024-01-15"),
      dueDate: new Date("2024-03-15"),
      status: "C",
      progress: 100,
      isArchived: "false",
      createdBy: executiveUser.id,
      createdAt: new Date()
    };

    const tactic2: Tactic = {
      id: randomUUID(),
      title: "Regional Partnership Development",
      description: "Establish partnerships with local businesses in target markets",
      strategyId: strategy1.id,
      kpi: "Number of strategic partnerships established",
      kpiTracking: "2 partnerships signed, 3 in negotiation",
      accountableLeaders: JSON.stringify([leaderUser.id, executiveUser.id]),
      resourcesRequired: "Legal team, business development resources, travel budget",
      startDate: new Date("2024-03-01"),
      dueDate: new Date("2024-06-30"),
      status: "OT",
      progress: 65,
      isArchived: "false",
      createdBy: executiveUser.id,
      createdAt: new Date()
    };

    this.tactics.set(tactic1.id, tactic1);
    this.tactics.set(tactic2.id, tactic2);
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const user: User = {
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(user.id, user);
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const existing = this.users.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...updates };
    this.users.set(id, updated);
    return updated;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  // Strategy methods
  async getStrategy(id: string): Promise<Strategy | undefined> {
    return this.strategies.get(id);
  }

  async getAllStrategies(): Promise<Strategy[]> {
    return Array.from(this.strategies.values());
  }

  async getStrategiesByCreator(creatorId: string): Promise<Strategy[]> {
    return Array.from(this.strategies.values()).filter(strategy => strategy.createdBy === creatorId);
  }

  async createStrategy(insertStrategy: InsertStrategy): Promise<Strategy> {
    const id = randomUUID();
    const strategy: Strategy = { 
      ...insertStrategy, 
      id,
      goal: insertStrategy.goal || null,
      status: insertStrategy.status || 'active',
      colorCode: insertStrategy.colorCode || '#3B82F6',
      displayOrder: insertStrategy.displayOrder ?? 0,
      createdAt: new Date()
    };
    this.strategies.set(id, strategy);
    
    // Create activity
    await this.createActivity({
      type: "strategy_created",
      description: `Created strategy "${strategy.title}"`,
      userId: strategy.createdBy,
      strategyId: id
    });

    return strategy;
  }

  async updateStrategy(id: string, updates: Partial<Strategy>): Promise<Strategy | undefined> {
    const existing = this.strategies.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...updates };
    this.strategies.set(id, updated);
    return updated;
  }

  async deleteStrategy(id: string): Promise<boolean> {
    // First delete all related tactics
    const relatedTactics = Array.from(this.tactics.values()).filter(tactic => tactic.strategyId === id);
    for (const tactic of relatedTactics) {
      this.tactics.delete(tactic.id);
    }
    
    // Delete all related outcomes
    const relatedOutcomes = Array.from(this.outcomes.values()).filter(outcome => outcome.strategyId === id);
    for (const outcome of relatedOutcomes) {
      this.outcomes.delete(outcome.id);
    }
    
    // Delete all related activities
    const relatedActivities = Array.from(this.activities.values()).filter(activity => activity.strategyId === id);
    for (const activity of relatedActivities) {
      this.activities.delete(activity.id);
    }
    
    // Finally delete the strategy
    const deleted = this.strategies.delete(id);
    
    if (deleted) {
      // Create deletion activity
      await this.createActivity({
        type: "strategy_deleted",
        description: `Deleted strategy and ${relatedTactics.length} tactics, ${relatedOutcomes.length} outcomes`,
        userId: "system",
        strategyId: null
      });
    }
    
    return deleted;
  }

  // Tactic methods
  async getTactic(id: string): Promise<Tactic | undefined> {
    return this.tactics.get(id);
  }

  async getAllTactics(): Promise<Tactic[]> {
    return Array.from(this.tactics.values());
  }

  async getTacticsByStrategy(strategyId: string): Promise<Tactic[]> {
    return Array.from(this.tactics.values()).filter(tactic => tactic.strategyId === strategyId);
  }

  async getTacticsByAssignee(assigneeId: string): Promise<Tactic[]> {
    return Array.from(this.tactics.values()).filter(tactic => {
      try {
        const leaders = JSON.parse(tactic.accountableLeaders);
        return Array.isArray(leaders) && leaders.includes(assigneeId);
      } catch {
        return tactic.accountableLeaders === assigneeId;
      }
    });
  }

  async createTactic(insertTactic: InsertTactic): Promise<Tactic> {
    const id = randomUUID();
    const tactic: Tactic = { 
      ...insertTactic, 
      id,
      status: insertTactic.status || 'NYS',
      progress: insertTactic.progress || 0,
      kpiTracking: insertTactic.kpiTracking || null,
      resourcesRequired: insertTactic.resourcesRequired || null,
      createdAt: new Date()
    };
    this.tactics.set(id, tactic);

    // Create activity
    await this.createActivity({
      type: "tactic_created",
      description: `Created tactic "${tactic.title}"`,
      userId: tactic.createdBy,
      strategyId: tactic.strategyId,
      tacticId: id
    });

    return tactic;
  }

  async updateTactic(id: string, updates: Partial<Tactic>): Promise<Tactic | undefined> {
    const existing = this.tactics.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...updates };
    this.tactics.set(id, updated);

    // Create activity for status changes
    if (updates.status === 'completed' && existing.status !== 'completed') {
      await this.createActivity({
        type: "tactic_completed",
        description: `Completed tactic "${updated.title}"`,
        userId: updated.createdBy,
        strategyId: updated.strategyId,
        tacticId: id
      });
    }

    return updated;
  }

  async deleteTactic(id: string): Promise<boolean> {
    return this.tactics.delete(id);
  }

  // Activity methods
  async getActivity(id: string): Promise<Activity | undefined> {
    return this.activities.get(id);
  }

  async getAllActivities(): Promise<Activity[]> {
    return Array.from(this.activities.values()).sort((a, b) => 
      (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
    );
  }

  async getActivitiesByUser(userId: string): Promise<Activity[]> {
    return Array.from(this.activities.values())
      .filter(activity => activity.userId === userId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const id = randomUUID();
    const activity: Activity = { 
      ...insertActivity, 
      id,
      strategyId: insertActivity.strategyId || null,
      tacticId: insertActivity.tacticId || null,
      createdAt: new Date()
    };
    this.activities.set(id, activity);
    return activity;
  }

  // Outcome methods
  async getOutcome(id: string): Promise<Outcome | undefined> {
    return this.outcomes.get(id);
  }

  async getAllOutcomes(): Promise<Outcome[]> {
    return Array.from(this.outcomes.values());
  }

  async getOutcomesByStrategy(strategyId: string): Promise<Outcome[]> {
    return Array.from(this.outcomes.values()).filter(outcome => outcome.strategyId === strategyId);
  }

  async getOutcomesByTactic(tacticId: string): Promise<Outcome[]> {
    return Array.from(this.outcomes.values()).filter(outcome => outcome.tacticId === tacticId);
  }

  async createOutcome(insertOutcome: InsertOutcome): Promise<Outcome> {
    const id = randomUUID();
    const outcome: Outcome = { 
      ...insertOutcome, 
      id,
      status: insertOutcome.status || 'in_progress',
      dueDate: insertOutcome.dueDate || null,
      tacticId: insertOutcome.tacticId || null,
      targetValue: insertOutcome.targetValue || null,
      currentValue: insertOutcome.currentValue || null,
      measurementUnit: insertOutcome.measurementUnit || null,
      createdAt: new Date()
    };
    this.outcomes.set(id, outcome);
    return outcome;
  }

  async updateOutcome(id: string, updates: Partial<Outcome>): Promise<Outcome | undefined> {
    const existing = this.outcomes.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...updates };
    this.outcomes.set(id, updated);
    return updated;
  }

  async deleteOutcome(id: string): Promise<boolean> {
    return this.outcomes.delete(id);
  }

  // Progress recalculation methods
  async recalculateTacticProgress(tacticId: string): Promise<void> {
    const tactic = this.tactics.get(tacticId);
    if (!tactic) return;

    // Get all non-archived outcomes for this tactic
    const tacticOutcomes = Array.from(this.outcomes.values()).filter(
      outcome => outcome.tacticId === tacticId && outcome.isArchived !== 'true'
    );

    if (tacticOutcomes.length === 0) {
      // No outcomes, set progress to 0
      tactic.progress = 0;
    } else {
      // Count completed outcomes (status === 'achieved')
      const completedCount = tacticOutcomes.filter(outcome => outcome.status === 'achieved').length;
      tactic.progress = Math.floor((completedCount / tacticOutcomes.length) * 100);
    }

    this.tactics.set(tacticId, tactic);
  }

  async recalculateStrategyProgress(strategyId: string): Promise<void> {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) return;

    // Get all non-archived tactics for this strategy
    const strategyTactics = Array.from(this.tactics.values()).filter(
      tactic => tactic.strategyId === strategyId && tactic.isArchived !== 'true'
    );

    if (strategyTactics.length === 0) {
      // No tactics, set progress to 0
      strategy.progress = 0;
    } else {
      // Calculate average of tactic progress percentages
      const totalProgress = strategyTactics.reduce((sum, tactic) => sum + tactic.progress, 0);
      strategy.progress = Math.floor(totalProgress / strategyTactics.length);
    }

    this.strategies.set(strategyId, strategy);
  }
}

// DatabaseStorage implementation
export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // Check if a user with this email already exists (e.g., with a pending- ID)
    if (userData.email) {
      const existingUsers = await db.select().from(users).where(eq(users.email, userData.email));
      
      // If user exists with a different ID (e.g., pending- ID), delete it first
      if (existingUsers.length > 0 && existingUsers[0].id !== userData.id) {
        await db.delete(users).where(eq(users.email, userData.email));
      }
    }
    
    // Now insert or update the user with their real Replit ID
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const [updated] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return updated || undefined;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  // Strategy methods
  async getStrategy(id: string): Promise<Strategy | undefined> {
    const [strategy] = await db.select().from(strategies).where(eq(strategies.id, id));
    return strategy || undefined;
  }

  async getAllStrategies(): Promise<Strategy[]> {
    return await db.select().from(strategies).orderBy(asc(strategies.displayOrder));
  }

  async getStrategiesByCreator(creatorId: string): Promise<Strategy[]> {
    return await db.select().from(strategies).where(eq(strategies.createdBy, creatorId));
  }

  async createStrategy(insertStrategy: InsertStrategy): Promise<Strategy> {
    const [strategy] = await db
      .insert(strategies)
      .values(insertStrategy)
      .returning();
    
    // Create activity
    await this.createActivity({
      type: "strategy_created",
      description: `Created strategy "${strategy.title}"`,
      userId: strategy.createdBy,
      strategyId: strategy.id
    });

    return strategy;
  }

  async updateStrategy(id: string, updates: Partial<Strategy>): Promise<Strategy | undefined> {
    const [updated] = await db
      .update(strategies)
      .set(updates)
      .where(eq(strategies.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteStrategy(id: string): Promise<boolean> {
    // First get counts for activity logging
    const relatedTactics = await db.select().from(tactics).where(eq(tactics.strategyId, id));
    const relatedOutcomes = await db.select().from(outcomes).where(eq(outcomes.strategyId, id));
    
    // Delete all related tactics (cascade)
    await db.delete(tactics).where(eq(tactics.strategyId, id));
    
    // Delete all related outcomes (cascade)
    await db.delete(outcomes).where(eq(outcomes.strategyId, id));
    
    // Delete all related activities (cascade)
    await db.delete(activities).where(eq(activities.strategyId, id));
    
    // Finally delete the strategy
    const result = await db.delete(strategies).where(eq(strategies.id, id));
    const deleted = (result.rowCount ?? 0) > 0;
    
    if (deleted) {
      // Create deletion activity
      await this.createActivity({
        type: "strategy_deleted",
        description: `Deleted strategy and ${relatedTactics.length} tactics, ${relatedOutcomes.length} outcomes`,
        userId: "system",
        strategyId: null
      });
    }
    
    return deleted;
  }

  // Tactic methods
  async getTactic(id: string): Promise<Tactic | undefined> {
    const [tactic] = await db.select().from(tactics).where(eq(tactics.id, id));
    return tactic || undefined;
  }

  async getAllTactics(): Promise<Tactic[]> {
    return await db.select().from(tactics);
  }

  async getTacticsByStrategy(strategyId: string): Promise<Tactic[]> {
    return await db.select().from(tactics).where(eq(tactics.strategyId, strategyId));
  }

  async getTacticsByAssignee(assigneeId: string): Promise<Tactic[]> {
    const allTactics = await db.select().from(tactics);
    return allTactics.filter(tactic => {
      try {
        const leaders = JSON.parse(tactic.accountableLeaders);
        return Array.isArray(leaders) && leaders.includes(assigneeId);
      } catch {
        return tactic.accountableLeaders === assigneeId;
      }
    });
  }

  async createTactic(insertTactic: InsertTactic): Promise<Tactic> {
    const [tactic] = await db
      .insert(tactics)
      .values(insertTactic)
      .returning();

    // Create activity
    await this.createActivity({
      type: "tactic_created",
      description: `Created tactic "${tactic.title}"`,
      userId: tactic.createdBy,
      strategyId: tactic.strategyId,
      tacticId: tactic.id
    });

    return tactic;
  }

  async updateTactic(id: string, updates: Partial<Tactic>): Promise<Tactic | undefined> {
    const [updated] = await db
      .update(tactics)
      .set(updates)
      .where(eq(tactics.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteTactic(id: string): Promise<boolean> {
    const result = await db.delete(tactics).where(eq(tactics.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Activity methods
  async getActivity(id: string): Promise<Activity | undefined> {
    const [activity] = await db.select().from(activities).where(eq(activities.id, id));
    return activity || undefined;
  }

  async getAllActivities(): Promise<Activity[]> {
    return await db.select().from(activities);
  }

  async getActivitiesByUser(userId: string): Promise<Activity[]> {
    return await db.select().from(activities).where(eq(activities.userId, userId));
  }

  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const [activity] = await db
      .insert(activities)
      .values(insertActivity)
      .returning();
    return activity;
  }

  // Outcome methods
  async getOutcome(id: string): Promise<Outcome | undefined> {
    const [outcome] = await db.select().from(outcomes).where(eq(outcomes.id, id));
    return outcome || undefined;
  }

  async getAllOutcomes(): Promise<Outcome[]> {
    return await db.select().from(outcomes);
  }

  async getOutcomesByStrategy(strategyId: string): Promise<Outcome[]> {
    return await db.select().from(outcomes).where(eq(outcomes.strategyId, strategyId));
  }

  async getOutcomesByTactic(tacticId: string): Promise<Outcome[]> {
    return await db.select().from(outcomes).where(eq(outcomes.tacticId, tacticId));
  }

  async createOutcome(insertOutcome: InsertOutcome): Promise<Outcome> {
    const [outcome] = await db
      .insert(outcomes)
      .values(insertOutcome)
      .returning();
    return outcome;
  }

  async updateOutcome(id: string, updates: Partial<Outcome>): Promise<Outcome | undefined> {
    const [outcome] = await db
      .update(outcomes)
      .set(updates)
      .where(eq(outcomes.id, id))
      .returning();
    return outcome || undefined;
  }

  async deleteOutcome(id: string): Promise<boolean> {
    const result = await db.delete(outcomes).where(eq(outcomes.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Progress recalculation methods
  async recalculateTacticProgress(tacticId: string): Promise<void> {
    // Get all non-archived outcomes for this tactic
    const tacticOutcomes = await db
      .select()
      .from(outcomes)
      .where(eq(outcomes.tacticId, tacticId));

    const nonArchivedOutcomes = tacticOutcomes.filter(outcome => outcome.isArchived !== 'true');

    let progress = 0;
    if (nonArchivedOutcomes.length > 0) {
      // Count completed outcomes (status === 'achieved')
      const completedCount = nonArchivedOutcomes.filter(outcome => outcome.status === 'achieved').length;
      progress = Math.floor((completedCount / nonArchivedOutcomes.length) * 100);
    }

    // Update tactic progress
    await db
      .update(tactics)
      .set({ progress })
      .where(eq(tactics.id, tacticId));
  }

  async recalculateStrategyProgress(strategyId: string): Promise<void> {
    // Get all non-archived tactics for this strategy
    const strategyTactics = await db
      .select()
      .from(tactics)
      .where(eq(tactics.strategyId, strategyId));

    const nonArchivedTactics = strategyTactics.filter(tactic => tactic.isArchived !== 'true');

    let progress = 0;
    if (nonArchivedTactics.length > 0) {
      // Calculate average of tactic progress percentages
      const totalProgress = nonArchivedTactics.reduce((sum, tactic) => sum + tactic.progress, 0);
      progress = Math.floor(totalProgress / nonArchivedTactics.length);
    }

    // Update strategy progress
    await db
      .update(strategies)
      .set({ progress })
      .where(eq(strategies.id, strategyId));
  }

  async seedData() {
    // Only seed in development mode
    if (process.env.NODE_ENV === 'production') {
      console.log('Skipping seed data in production');
      return;
    }

    // Check if strategies already exist (don't re-seed if data exists)
    const existingStrategies = await this.getAllStrategies();
    if (existingStrategies.length > 0) {
      return; // Data already seeded
    }

    console.log('Seeding development data...');

    // Get or create sample users for development
    const adminResult = await db.select().from(users).where(eq(users.email, 'admin@example.com'));
    let adminUser = adminResult[0];
    if (!adminUser) {
      const [created] = await db.insert(users).values({
        email: "admin@example.com",
        firstName: "Admin",
        lastName: "User",
        profileImageUrl: null,
        role: "administrator"
      }).returning();
      adminUser = created;
    }
    
    const execResult = await db.select().from(users).where(eq(users.email, 'exec@example.com'));
    let executiveUser = execResult[0];
    if (!executiveUser) {
      const [created] = await db.insert(users).values({
        email: "exec@example.com",
        firstName: "Executive",
        lastName: "User",
        profileImageUrl: null,
        role: "executive"
      }).returning();
      executiveUser = created;
    }
    
    const leaderResult = await db.select().from(users).where(eq(users.email, 'leader@example.com'));
    let leaderUser = leaderResult[0];
    if (!leaderUser) {
      const [created] = await db.insert(users).values({
        email: "leader@example.com",
        firstName: "Leader",
        lastName: "User",
        profileImageUrl: null,
        role: "leader"
      }).returning();
      leaderUser = created;
    }

    // Create sample strategies for development
    const strategy1 = await this.createStrategy({
      title: "Digital Transformation Framework",
      description: "Comprehensive digital transformation initiative to modernize operations and improve customer experience",
      goal: "Transform business operations through digital innovation",
      startDate: new Date("2024-01-01"),
      targetDate: new Date("2024-12-31"),
      metrics: "Reduce operational costs by 20%, improve customer satisfaction to 90%, achieve 95% digital process adoption",
      status: "Active",
      completionDate: null,
      colorCode: "#10B981",
      displayOrder: 0,
      createdBy: executiveUser.id
    });

    const strategy2 = await this.createStrategy({
      title: "Customer Experience Excellence",
      description: "Focus on delivering exceptional customer experiences across all touchpoints",
      goal: "Become the industry leader in customer satisfaction",
      startDate: new Date("2024-02-01"),
      targetDate: new Date("2024-11-30"),
      metrics: "Achieve NPS score of 80+, reduce complaint resolution time by 50%, increase customer retention to 95%",
      status: "Completed",
      completionDate: new Date("2024-11-15"),
      colorCode: "#F59E0B",
      displayOrder: 1,
      createdBy: executiveUser.id
    });

    // Create sample tactics for development
    await this.createTactic({
      title: "Market Research Analysis",
      description: "Conduct comprehensive market research for target regions",
      strategyId: strategy1.id,
      kpi: "Number of markets analyzed",
      kpiTracking: "3 out of 5 markets completed",
      accountableLeaders: JSON.stringify([leaderUser.id]),
      resourcesRequired: "Research team, market analysis tools, $50k budget",
      startDate: new Date("2024-01-01"),
      dueDate: new Date("2024-03-14"),
      status: "C",
      progress: 100,
      isArchived: 'false',
      createdBy: executiveUser.id
    });

    console.log('Development data seeded successfully');
  }
}

export const storage = new DatabaseStorage();
