import { type User, type InsertUser, type Strategy, type InsertStrategy, type Tactic, type InsertTactic, type Activity, type InsertActivity, users, strategies, tactics, activities } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
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
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private strategies: Map<string, Strategy> = new Map();
  private tactics: Map<string, Tactic> = new Map();
  private activities: Map<string, Activity> = new Map();

  constructor() {
    this.seedData();
  }

  private seedData() {
    // Create sample users
    const adminUser: User = {
      id: randomUUID(),
      username: "john.doe",
      name: "John Doe",
      role: "administrator",
      initials: "JD"
    };
    
    const executiveUser: User = {
      id: randomUUID(),
      username: "mike.wilson",
      name: "Mike Wilson",
      role: "executive",
      initials: "MW"
    };
    
    const leaderUser: User = {
      id: randomUUID(),
      username: "sarah.johnson",
      name: "Sarah Johnson",
      role: "leader",
      initials: "SJ"
    };

    this.users.set(adminUser.id, adminUser);
    this.users.set(executiveUser.id, executiveUser);
    this.users.set(leaderUser.id, leaderUser);

    // Create sample strategies
    const strategy1: Strategy = {
      id: randomUUID(),
      title: "Market Expansion Initiative",
      description: "Expand into new geographic markets to increase revenue by 25%",
      startDate: new Date("2024-01-01"),
      targetDate: new Date("2024-12-31"),
      metrics: "25% revenue increase, 3 new markets",
      status: "active",
      colorCode: "#22C55E",
      createdBy: adminUser.id,
      createdAt: new Date()
    };

    const strategy2: Strategy = {
      id: randomUUID(),
      title: "Digital Transformation",
      description: "Modernize core systems and improve operational efficiency",
      startDate: new Date("2024-02-01"),
      targetDate: new Date("2024-10-31"),
      metrics: "50% efficiency improvement, 95% system uptime",
      status: "active",
      colorCode: "#3B82F6",
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

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
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
      status: insertStrategy.status || 'active',
      colorCode: insertStrategy.colorCode || '#3B82F6',
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
    return this.strategies.delete(id);
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
}

// DatabaseStorage implementation
export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
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
    return await db.select().from(strategies);
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
    const result = await db.delete(strategies).where(eq(strategies.id, id));
    return (result.rowCount ?? 0) > 0;
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

  async seedData() {
    // Check if data already exists
    const existingUsers = await this.getAllUsers();
    if (existingUsers.length > 0) {
      return; // Data already seeded
    }

    // Create sample users
    const adminUser = await this.createUser({
      username: "john.doe",
      name: "John Doe",
      role: "administrator",
      initials: "JD"
    });
    
    const executiveUser = await this.createUser({
      username: "mike.wilson",
      name: "Mike Wilson",
      role: "executive",
      initials: "MW"
    });
    
    const leaderUser = await this.createUser({
      username: "sarah.johnson",
      name: "Sarah Johnson",
      role: "leader",
      initials: "SJ"
    });

    // Create sample strategy
    const strategy = await this.createStrategy({
      title: "Market Expansion Initiative",
      description: "Expand our market presence in target regions through strategic partnerships and enhanced digital marketing",
      startDate: new Date("2024-01-01"),
      targetDate: new Date("2024-12-31"),
      metrics: "Increase market share by 15%, establish 5 new partnerships, achieve 30% growth in target regions",
      createdBy: executiveUser.id
    });

    // Create sample tactics
    await this.createTactic({
      title: "Market Research Analysis",
      description: "Conduct comprehensive market research for target regions",
      strategyId: strategy.id,
      kpi: "Number of markets analyzed",
      kpiTracking: "3 out of 5 markets completed",
      accountableLeaders: JSON.stringify([leaderUser.id]),
      resourcesRequired: "Research team, market analysis tools, $50k budget",
      startDate: new Date("2024-01-01"),
      dueDate: new Date("2024-03-14"),
      status: "C",
      progress: 100,
      createdBy: executiveUser.id
    });

    await this.createTactic({
      title: "Regional Partnership Development",
      description: "Establish partnerships with local businesses in target markets",
      strategyId: strategy.id,
      kpi: "Number of strategic partnerships established",
      kpiTracking: "2 partnerships signed, 3 in negotiation",
      accountableLeaders: JSON.stringify([leaderUser.id, executiveUser.id]),
      resourcesRequired: "Legal team, business development resources, travel budget",
      startDate: new Date("2024-03-15"),
      dueDate: new Date("2024-06-29"),
      status: "OT",
      progress: 65,
      createdBy: executiveUser.id
    });
  }
}

export const storage = new DatabaseStorage();
