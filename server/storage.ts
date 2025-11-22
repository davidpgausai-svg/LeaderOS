import { type User, type UpsertUser, type InsertUser, type Strategy, type InsertStrategy, type Tactic, type InsertTactic, type Activity, type InsertActivity, type Outcome, type InsertOutcome, type Notification, type InsertNotification, type OutcomeDocument, type InsertOutcomeDocument, type OutcomeChecklistItem, type InsertOutcomeChecklistItem, type UserStrategyAssignment, type InsertUserStrategyAssignment, type MeetingNote, type InsertMeetingNote, users, strategies, tactics, activities, outcomes, notifications, outcomeDocuments, outcomeChecklistItems, userStrategyAssignments, meetingNotes } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, asc, and } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  deleteUser(id: string): Promise<boolean>;

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

  // Notification methods
  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotificationsByUser(userId: string): Promise<Notification[]>;
  markNotificationAsRead(id: string): Promise<Notification | undefined>;
  markNotificationAsUnread(id: string): Promise<Notification | undefined>;
  markAllNotificationsAsRead(userId: string): Promise<void>;
  deleteNotification(id: string): Promise<boolean>;

  // Outcome Document methods
  getOutcomeDocuments(outcomeId: string): Promise<OutcomeDocument[]>;
  createOutcomeDocument(document: InsertOutcomeDocument): Promise<OutcomeDocument>;
  updateOutcomeDocument(id: string, updates: Partial<OutcomeDocument>): Promise<OutcomeDocument | undefined>;
  deleteOutcomeDocument(id: string): Promise<boolean>;

  // Outcome Checklist Item methods
  getOutcomeChecklistItems(outcomeId: string): Promise<OutcomeChecklistItem[]>;
  createOutcomeChecklistItem(item: InsertOutcomeChecklistItem): Promise<OutcomeChecklistItem>;
  updateOutcomeChecklistItem(id: string, updates: Partial<OutcomeChecklistItem>): Promise<OutcomeChecklistItem | undefined>;
  deleteOutcomeChecklistItem(id: string): Promise<boolean>;

  // User Strategy Assignment methods
  getUserStrategyAssignments(userId: string): Promise<UserStrategyAssignment[]>;
  getStrategyAssignments(strategyId: string): Promise<UserStrategyAssignment[]>;
  assignStrategy(userId: string, strategyId: string, assignedBy: string): Promise<UserStrategyAssignment>;
  unassignStrategy(userId: string, strategyId: string): Promise<boolean>;
  getUserAssignedStrategyIds(userId: string): Promise<string[]>;

  // Meeting Notes methods
  getAllMeetingNotes(): Promise<MeetingNote[]>;
  getMeetingNote(id: string): Promise<MeetingNote | undefined>;
  createMeetingNote(note: InsertMeetingNote): Promise<MeetingNote>;
  updateMeetingNote(id: string, updates: Partial<MeetingNote>): Promise<MeetingNote | undefined>;
  deleteMeetingNote(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private strategies: Map<string, Strategy> = new Map();
  private tactics: Map<string, Tactic> = new Map();
  private activities: Map<string, Activity> = new Map();
  private outcomes: Map<string, Outcome> = new Map();
  private userStrategyAssignmentsMap: Map<string, UserStrategyAssignment> = new Map();

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
    
    const coLeadUser1: User = {
      id: randomUUID(),
      email: "mike.wilson@example.com",
      firstName: "Mike",
      lastName: "Wilson",
      profileImageUrl: null,
      role: "co_lead",
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const coLeadUser2: User = {
      id: randomUUID(),
      email: "sarah.johnson@example.com",
      firstName: "Sarah",
      lastName: "Johnson",
      profileImageUrl: null,
      role: "co_lead",
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.users.set(adminUser.id, adminUser);
    this.users.set(coLeadUser1.id, coLeadUser1);
    this.users.set(coLeadUser2.id, coLeadUser2);

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
      caseForChange: "Growing market demands and competitive pressures require strategic expansion into new geographic territories",
      visionStatement: "Become the market leader in three new regional markets within 12 months",
      successMetrics: "25% revenue increase, 3 new markets entered, 15% market share in each new region",
      stakeholderMap: "Executive team (sponsors), Sales leaders (champions), Regional managers (key stakeholders), Legal & Compliance (advisors)",
      readinessRating: "Amber - Moderate readiness, some resource constraints",
      riskExposureRating: "Amber - Medium risk due to market uncertainties and regulatory requirements",
      changeChampionAssignment: "Mike Wilson (Co-Lead) - Primary sponsor, Sarah Johnson (Co-Lead) - Implementation champion",
      reinforcementPlan: "Quarterly business reviews, monthly progress updates to stakeholders, recognition program for early wins",
      benefitsRealizationPlan: "Track market share monthly, revenue impact quarterly, customer acquisition metrics weekly",
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
      caseForChange: "Legacy systems are causing operational inefficiencies and limiting our ability to compete in a digital-first market",
      visionStatement: "Transform into a digitally-enabled organization with modern systems supporting agile operations",
      successMetrics: "50% efficiency improvement, 95% system uptime, 30% reduction in manual processes",
      stakeholderMap: "CTO (sponsor), IT Directors (champions), Department heads (key stakeholders), End users (impacted)",
      readinessRating: "Green - Strong readiness with executive support and allocated budget",
      riskExposureRating: "Amber - Medium risk due to technical complexity and change adoption challenges",
      changeChampionAssignment: "David Gaus (Administrator) - Executive sponsor, Mike Wilson (Co-Lead) - Technical champion",
      reinforcementPlan: "Weekly team huddles, bi-weekly stakeholder updates, training programs, success stories communication",
      benefitsRealizationPlan: "Monitor system performance metrics daily, efficiency gains monthly, user adoption rates weekly",
      createdBy: coLeadUser1.id,
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
      accountableLeaders: JSON.stringify([coLeadUser2.id]),
      resourcesRequired: "Research team, market analysis tools, $50k budget",
      startDate: new Date("2024-01-15"),
      dueDate: new Date("2024-03-15"),
      status: "C",
      progress: 100,
      isArchived: "false",
      documentFolderUrl: null,
      createdBy: coLeadUser1.id,
      createdAt: new Date()
    };

    const tactic2: Tactic = {
      id: randomUUID(),
      title: "Regional Partnership Development",
      description: "Establish partnerships with local businesses in target markets",
      strategyId: strategy1.id,
      kpi: "Number of strategic partnerships established",
      kpiTracking: "2 partnerships signed, 3 in negotiation",
      accountableLeaders: JSON.stringify([coLeadUser2.id, coLeadUser1.id]),
      resourcesRequired: "Legal team, business development resources, travel budget",
      startDate: new Date("2024-03-01"),
      dueDate: new Date("2024-06-30"),
      status: "OT",
      progress: 65,
      isArchived: "false",
      documentFolderUrl: null,
      createdBy: coLeadUser1.id,
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
      id: userData.id ?? randomUUID(),
      email: userData.email ?? null,
      firstName: userData.firstName ?? null,
      lastName: userData.lastName ?? null,
      profileImageUrl: userData.profileImageUrl ?? null,
      role: userData.role ?? 'co_lead',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(user.id, user);
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      id,
      email: insertUser.email ?? null,
      firstName: insertUser.firstName ?? null,
      lastName: insertUser.lastName ?? null,
      profileImageUrl: insertUser.profileImageUrl ?? null,
      role: insertUser.role ?? 'co_lead',
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

  async deleteUser(id: string): Promise<boolean> {
    return this.users.delete(id);
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
      progress: 0,
      completionDate: insertStrategy.completionDate ?? null,
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
      progress: 0,
      isArchived: insertTactic.isArchived || 'false',
      kpiTracking: insertTactic.kpiTracking || null,
      resourcesRequired: insertTactic.resourcesRequired || null,
      documentFolderUrl: insertTactic.documentFolderUrl || null,
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
      isArchived: insertOutcome.isArchived || 'false',
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

  // Notification methods (stub - not used in production)
  async createNotification(notification: InsertNotification): Promise<Notification> {
    throw new Error("MemStorage notification methods not implemented");
  }

  async getNotificationsByUser(userId: string): Promise<Notification[]> {
    return [];
  }

  async markNotificationAsRead(id: string): Promise<Notification | undefined> {
    return undefined;
  }

  async markNotificationAsUnread(id: string): Promise<Notification | undefined> {
    return undefined;
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    return;
  }

  async deleteNotification(id: string): Promise<boolean> {
    return false;
  }

  // Outcome Document methods (stub - not used in production)
  async getOutcomeDocuments(outcomeId: string): Promise<OutcomeDocument[]> {
    return [];
  }

  async createOutcomeDocument(document: InsertOutcomeDocument): Promise<OutcomeDocument> {
    throw new Error("MemStorage outcome document methods not implemented");
  }

  async updateOutcomeDocument(id: string, updates: Partial<OutcomeDocument>): Promise<OutcomeDocument | undefined> {
    return undefined;
  }

  async deleteOutcomeDocument(id: string): Promise<boolean> {
    return false;
  }

  // Outcome Checklist Item methods (stub - not used in production)
  async getOutcomeChecklistItems(outcomeId: string): Promise<OutcomeChecklistItem[]> {
    return [];
  }

  async createOutcomeChecklistItem(item: InsertOutcomeChecklistItem): Promise<OutcomeChecklistItem> {
    throw new Error("MemStorage checklist methods not implemented");
  }

  async updateOutcomeChecklistItem(id: string, updates: Partial<OutcomeChecklistItem>): Promise<OutcomeChecklistItem | undefined> {
    return undefined;
  }

  async deleteOutcomeChecklistItem(id: string): Promise<boolean> {
    return false;
  }

  // User Strategy Assignment methods
  async getUserStrategyAssignments(userId: string): Promise<UserStrategyAssignment[]> {
    return Array.from(this.userStrategyAssignmentsMap.values()).filter(a => a.userId === userId);
  }

  async getStrategyAssignments(strategyId: string): Promise<UserStrategyAssignment[]> {
    return Array.from(this.userStrategyAssignmentsMap.values()).filter(a => a.strategyId === strategyId);
  }

  async assignStrategy(userId: string, strategyId: string, assignedBy: string): Promise<UserStrategyAssignment> {
    const id = randomUUID();
    const assignment: UserStrategyAssignment = {
      id,
      userId,
      strategyId,
      assignedBy,
      assignedAt: new Date()
    };
    this.userStrategyAssignmentsMap.set(id, assignment);
    return assignment;
  }

  async unassignStrategy(userId: string, strategyId: string): Promise<boolean> {
    const assignment = Array.from(this.userStrategyAssignmentsMap.values())
      .find(a => a.userId === userId && a.strategyId === strategyId);
    if (assignment) {
      this.userStrategyAssignmentsMap.delete(assignment.id);
      return true;
    }
    return false;
  }

  async getUserAssignedStrategyIds(userId: string): Promise<string[]> {
    const assignments = await this.getUserStrategyAssignments(userId);
    return assignments.map(a => a.strategyId);
  }

  // Meeting Notes methods (stub - not used in production)
  async getAllMeetingNotes(): Promise<MeetingNote[]> {
    return [];
  }

  async getMeetingNote(id: string): Promise<MeetingNote | undefined> {
    return undefined;
  }

  async createMeetingNote(note: InsertMeetingNote): Promise<MeetingNote> {
    throw new Error("MemStorage meeting notes methods not implemented");
  }

  async updateMeetingNote(id: string, updates: Partial<MeetingNote>): Promise<MeetingNote | undefined> {
    return undefined;
  }

  async deleteMeetingNote(id: string): Promise<boolean> {
    return false;
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

  async deleteUser(id: string): Promise<boolean> {
    // Delete in a transaction to ensure cascade deletion
    const result = await db.transaction(async (tx) => {
      // First delete user strategy assignments
      await tx.delete(userStrategyAssignments).where(eq(userStrategyAssignments.userId, id));
      
      // Then delete the user
      const deleteResult = await tx.delete(users).where(eq(users.id, id));
      return deleteResult;
    });
    
    return (result.rowCount ?? 0) > 0;
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
    // Convert date strings to Date objects
    const processedUpdates = { ...updates };
    if (processedUpdates.startDate && typeof processedUpdates.startDate === 'string') {
      processedUpdates.startDate = new Date(processedUpdates.startDate);
    }
    if (processedUpdates.dueDate && typeof processedUpdates.dueDate === 'string') {
      processedUpdates.dueDate = new Date(processedUpdates.dueDate);
    }

    const [updated] = await db
      .update(tactics)
      .set(processedUpdates)
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

  // Notification methods
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [created] = await db
      .insert(notifications)
      .values(notification)
      .returning();
    return created;
  }

  async getNotificationsByUser(userId: string): Promise<Notification[]> {
    const results = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(asc(notifications.createdAt));
    return results;
  }

  async markNotificationAsRead(id: string): Promise<Notification | undefined> {
    const [updated] = await db
      .update(notifications)
      .set({ isRead: 'true' })
      .where(eq(notifications.id, id))
      .returning();
    return updated || undefined;
  }

  async markNotificationAsUnread(id: string): Promise<Notification | undefined> {
    const [updated] = await db
      .update(notifications)
      .set({ isRead: 'false' })
      .where(eq(notifications.id, id))
      .returning();
    return updated || undefined;
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: 'true' })
      .where(eq(notifications.userId, userId));
  }

  async deleteNotification(id: string): Promise<boolean> {
    const result = await db
      .delete(notifications)
      .where(eq(notifications.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Outcome Document methods
  async getOutcomeDocuments(outcomeId: string): Promise<OutcomeDocument[]> {
    return await db
      .select()
      .from(outcomeDocuments)
      .where(eq(outcomeDocuments.outcomeId, outcomeId))
      .orderBy(asc(outcomeDocuments.createdAt));
  }

  async createOutcomeDocument(document: InsertOutcomeDocument): Promise<OutcomeDocument> {
    const [created] = await db.insert(outcomeDocuments).values(document).returning();
    return created;
  }

  async updateOutcomeDocument(id: string, updates: Partial<OutcomeDocument>): Promise<OutcomeDocument | undefined> {
    const [updated] = await db
      .update(outcomeDocuments)
      .set(updates)
      .where(eq(outcomeDocuments.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteOutcomeDocument(id: string): Promise<boolean> {
    const result = await db
      .delete(outcomeDocuments)
      .where(eq(outcomeDocuments.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Outcome Checklist Item methods
  async getOutcomeChecklistItems(outcomeId: string): Promise<OutcomeChecklistItem[]> {
    return await db
      .select()
      .from(outcomeChecklistItems)
      .where(eq(outcomeChecklistItems.outcomeId, outcomeId))
      .orderBy(asc(outcomeChecklistItems.orderIndex));
  }

  async createOutcomeChecklistItem(item: InsertOutcomeChecklistItem): Promise<OutcomeChecklistItem> {
    const [created] = await db.insert(outcomeChecklistItems).values(item).returning();
    return created;
  }

  async updateOutcomeChecklistItem(id: string, updates: Partial<OutcomeChecklistItem>): Promise<OutcomeChecklistItem | undefined> {
    const [updated] = await db
      .update(outcomeChecklistItems)
      .set(updates)
      .where(eq(outcomeChecklistItems.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteOutcomeChecklistItem(id: string): Promise<boolean> {
    const result = await db
      .delete(outcomeChecklistItems)
      .where(eq(outcomeChecklistItems.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // User Strategy Assignment methods
  async getUserStrategyAssignments(userId: string): Promise<UserStrategyAssignment[]> {
    return await db
      .select()
      .from(userStrategyAssignments)
      .where(eq(userStrategyAssignments.userId, userId));
  }

  async getStrategyAssignments(strategyId: string): Promise<UserStrategyAssignment[]> {
    return await db
      .select()
      .from(userStrategyAssignments)
      .where(eq(userStrategyAssignments.strategyId, strategyId));
  }

  async assignStrategy(userId: string, strategyId: string, assignedBy: string): Promise<UserStrategyAssignment> {
    const [assignment] = await db.insert(userStrategyAssignments).values({
      userId,
      strategyId,
      assignedBy
    }).returning();
    return assignment;
  }

  async unassignStrategy(userId: string, strategyId: string): Promise<boolean> {
    const result = await db
      .delete(userStrategyAssignments)
      .where(
        and(
          eq(userStrategyAssignments.userId, userId),
          eq(userStrategyAssignments.strategyId, strategyId)
        )
      );
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getUserAssignedStrategyIds(userId: string): Promise<string[]> {
    const assignments = await this.getUserStrategyAssignments(userId);
    return assignments.map(a => a.strategyId);
  }

  // Meeting Notes methods
  async getAllMeetingNotes(): Promise<MeetingNote[]> {
    return await db
      .select()
      .from(meetingNotes)
      .orderBy(asc(meetingNotes.meetingDate));
  }

  async getMeetingNote(id: string): Promise<MeetingNote | undefined> {
    const [note] = await db
      .select()
      .from(meetingNotes)
      .where(eq(meetingNotes.id, id));
    return note;
  }

  async createMeetingNote(note: InsertMeetingNote): Promise<MeetingNote> {
    const [created] = await db
      .insert(meetingNotes)
      .values(note)
      .returning();
    return created;
  }

  async updateMeetingNote(id: string, updates: Partial<MeetingNote>): Promise<MeetingNote | undefined> {
    const [updated] = await db
      .update(meetingNotes)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(meetingNotes.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteMeetingNote(id: string): Promise<boolean> {
    const result = await db
      .delete(meetingNotes)
      .where(eq(meetingNotes.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
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
    
    const coLead1Result = await db.select().from(users).where(eq(users.email, 'colead1@example.com'));
    let coLeadUser1 = coLead1Result[0];
    if (!coLeadUser1) {
      const [created] = await db.insert(users).values({
        email: "colead1@example.com",
        firstName: "Co-Lead",
        lastName: "User 1",
        profileImageUrl: null,
        role: "co_lead"
      }).returning();
      coLeadUser1 = created;
    }
    
    const coLead2Result = await db.select().from(users).where(eq(users.email, 'colead2@example.com'));
    let coLeadUser2 = coLead2Result[0];
    if (!coLeadUser2) {
      const [created] = await db.insert(users).values({
        email: "colead2@example.com",
        firstName: "Co-Lead",
        lastName: "User 2",
        profileImageUrl: null,
        role: "co_lead"
      }).returning();
      coLeadUser2 = created;
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
      caseForChange: "Legacy systems and processes are hindering growth and customer satisfaction in a rapidly evolving digital landscape",
      visionStatement: "Become a digitally-enabled organization delivering seamless customer experiences and operational excellence",
      successMetrics: "20% cost reduction, 90% customer satisfaction, 95% digital adoption rate",
      stakeholderMap: "Executive team (sponsors), IT department (implementers), All departments (impacted users)",
      readinessRating: "Green - Strong executive support and allocated budget",
      riskExposureRating: "Amber - Medium risk due to scale and complexity of transformation",
      changeChampionAssignment: "Co-Lead User 1 - Executive sponsor and primary champion",
      reinforcementPlan: "Monthly progress reviews, quarterly celebrations of milestones, continuous communication of benefits",
      benefitsRealizationPlan: "Track cost savings monthly, measure customer satisfaction quarterly, monitor adoption rates weekly",
      createdBy: coLeadUser1.id
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
      caseForChange: "Customer expectations are rising and competitors are outperforming us in customer satisfaction metrics",
      visionStatement: "Be recognized as the industry leader in customer experience and satisfaction",
      successMetrics: "NPS score of 80+, 50% faster complaint resolution, 95% customer retention rate",
      stakeholderMap: "Customer service team (champions), Sales team (key stakeholders), All customer-facing staff (implementers)",
      readinessRating: "Green - High readiness with experienced customer service leadership",
      riskExposureRating: "Green - Low risk due to clear metrics and proven methodologies",
      changeChampionAssignment: "Co-Lead User 2 - Customer experience champion and implementation lead",
      reinforcementPlan: "Weekly team huddles, monthly recognition of customer service wins, ongoing customer feedback sharing",
      benefitsRealizationPlan: "Track NPS monthly, monitor complaint resolution times daily, review retention rates quarterly",
      createdBy: coLeadUser1.id
    });

    // Create sample tactics for development
    await this.createTactic({
      title: "Market Research Analysis",
      description: "Conduct comprehensive market research for target regions",
      strategyId: strategy1.id,
      kpi: "Number of markets analyzed",
      kpiTracking: "3 out of 5 markets completed",
      accountableLeaders: JSON.stringify([coLeadUser2.id]),
      resourcesRequired: "Research team, market analysis tools, $50k budget",
      startDate: new Date("2024-01-01"),
      dueDate: new Date("2024-03-14"),
      status: "C",
      isArchived: 'false',
      createdBy: coLeadUser1.id
    });

    // Create strategy assignments for co-lead users (assign all strategies to all co-leads)
    await db.insert(userStrategyAssignments).values([
      {
        userId: coLeadUser1.id,
        strategyId: strategy1.id,
        assignedBy: adminUser.id
      },
      {
        userId: coLeadUser1.id,
        strategyId: strategy2.id,
        assignedBy: adminUser.id
      },
      {
        userId: coLeadUser2.id,
        strategyId: strategy1.id,
        assignedBy: adminUser.id
      },
      {
        userId: coLeadUser2.id,
        strategyId: strategy2.id,
        assignedBy: adminUser.id
      }
    ]);

    console.log('Development data seeded successfully');
  }
}

export const storage = new DatabaseStorage();
