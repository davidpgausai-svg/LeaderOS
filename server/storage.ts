import { type User, type InsertUser, type Strategy, type InsertStrategy, type Tactic, type InsertTactic, type Activity, type InsertActivity } from "@shared/schema";
import { randomUUID } from "crypto";

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
      assignedTo: leaderUser.id,
      startDate: new Date("2024-01-15"),
      dueDate: new Date("2024-03-15"),
      status: "completed",
      progress: 100,
      createdBy: executiveUser.id,
      createdAt: new Date()
    };

    const tactic2: Tactic = {
      id: randomUUID(),
      title: "Regional Partnership Development",
      description: "Establish partnerships with local businesses in target markets",
      strategyId: strategy1.id,
      assignedTo: leaderUser.id,
      startDate: new Date("2024-03-01"),
      dueDate: new Date("2024-06-30"),
      status: "in-progress",
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
    return Array.from(this.tactics.values()).filter(tactic => tactic.assignedTo === assigneeId);
  }

  async createTactic(insertTactic: InsertTactic): Promise<Tactic> {
    const id = randomUUID();
    const tactic: Tactic = { 
      ...insertTactic, 
      id,
      status: insertTactic.status || 'not-started',
      progress: insertTactic.progress || 0,
      assignedTo: insertTactic.assignedTo || null,
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
        userId: updated.assignedTo || updated.createdBy,
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

export const storage = new MemStorage();
