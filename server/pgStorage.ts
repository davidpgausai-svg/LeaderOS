import { db } from './db';
import { eq, desc, and, sql, inArray, or, isNull, isNotNull } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import type { IStorage } from './storage';
import {
  users, strategies, projects, activities, actions, notifications,
  actionDocuments, actionChecklistItems, userStrategyAssignments,
  barriers, dependencies, templateTypes,
  organizations, passwordResetTokens, twoFactorCodes, executiveGoals, strategyExecutiveGoals,
  teamTags, projectTeamTags, userTeamTags, projectResourceAssignments, actionPeopleAssignments, ptoEntries, holidays,
  projectSnapshots,
  type User, type UpsertUser, type InsertUser,
  type Strategy, type InsertStrategy,
  type Project, type InsertProject,
  type Activity, type InsertActivity,
  type Action, type InsertAction,
  type Notification, type InsertNotification,
  type ActionDocument, type InsertActionDocument,
  type ActionChecklistItem, type InsertActionChecklistItem, type CreateActionChecklistItem,
  type UserStrategyAssignment,
  type Barrier, type InsertBarrier,
  type Dependency, type InsertDependency,
  type TemplateType, type InsertTemplateType,
  type Organization,
  type PasswordResetToken,
  type TwoFactorCode,
  type ExecutiveGoal, type InsertExecutiveGoal,
  type StrategyExecutiveGoal,
  type TeamTag, type InsertTeamTag,
  type ProjectTeamTag,
  type UserTeamTag,
  type ProjectResourceAssignment, type InsertProjectResourceAssignment,
  type ActionPeopleAssignment, type InsertActionPeopleAssignment,
  type PtoEntry, type InsertPtoEntry,
  type Holiday, type InsertHoliday,
  type ProjectSnapshot, type InsertProjectSnapshot,
  type IntakeForm, type InsertIntakeForm,
  type IntakeSubmission, type InsertIntakeSubmission,
  intakeForms, intakeSubmissions,
  decisions, decisionRaciAssignments,
  type Decision, type InsertDecision,
  type DecisionRaci, type InsertDecisionRaci,
  workstreams, phases, workstreamDependencies, gateCriteria,
  type Workstream, type InsertWorkstream,
  type Phase, type InsertPhase,
  type WorkstreamDependency, type InsertWorkstreamDependency,
  type GateCriteria, type InsertGateCriteria,
} from '@shared/schema';

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    let existingUser: User | undefined;
    
    if (userData.id) {
      existingUser = await this.getUser(userData.id);
    }
    if (!existingUser && userData.email) {
      existingUser = await this.getUserByEmail(userData.email);
    }
    
    const id = existingUser?.id || userData.id || randomUUID();
    const organizationId = userData.organizationId !== undefined ? userData.organizationId : (existingUser?.organizationId || null);
    const isSuperAdmin = userData.isSuperAdmin !== undefined ? userData.isSuperAdmin : (existingUser?.isSuperAdmin || 'false');

    if (userData.email && existingUser?.id !== id) {
      await db.delete(users).where(and(eq(users.email, userData.email)));
    }

    const [user] = await db.insert(users).values({
      id,
      email: userData.email || null,
      firstName: userData.firstName || null,
      lastName: userData.lastName || null,
      profileImageUrl: userData.profileImageUrl || null,
      role: userData.role || 'co_lead',
      timezone: userData.timezone || 'America/Chicago',
      organizationId,
      isSuperAdmin,
    }).onConflictDoUpdate({
      target: users.id,
      set: {
        email: userData.email || sql`${users.email}`,
        firstName: userData.firstName || sql`${users.firstName}`,
        lastName: userData.lastName || sql`${users.lastName}`,
        profileImageUrl: userData.profileImageUrl || sql`${users.profileImageUrl}`,
        role: userData.role || sql`${users.role}`,
        timezone: userData.timezone || sql`${users.timezone}`,
        organizationId: organizationId,
        isSuperAdmin: isSuperAdmin,
        updatedAt: new Date(),
      }
    }).returning();

    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values({
      id: randomUUID(),
      ...insertUser,
    }).returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db.update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  async getUsersByOrganization(organizationId: string): Promise<User[]> {
    return db.select().from(users).where(eq(users.organizationId, organizationId));
  }

  async deleteUser(id: string): Promise<boolean> {
    await db.delete(userStrategyAssignments).where(eq(userStrategyAssignments.userId, id));
    const result = await db.delete(users).where(eq(users.id, id)).returning();
    return result.length > 0;
  }

  async getStrategy(id: string): Promise<Strategy | undefined> {
    const [strategy] = await db.select().from(strategies).where(eq(strategies.id, id));
    return strategy || undefined;
  }

  async getAllStrategies(): Promise<Strategy[]> {
    return db.select().from(strategies).orderBy(strategies.displayOrder);
  }

  async getStrategiesByOrganization(organizationId: string): Promise<Strategy[]> {
    return db.select().from(strategies)
      .where(eq(strategies.organizationId, organizationId))
      .orderBy(strategies.displayOrder);
  }

  async getStrategiesByCreator(creatorId: string): Promise<Strategy[]> {
    return db.select().from(strategies).where(eq(strategies.createdBy, creatorId));
  }

  async createStrategy(insertStrategy: InsertStrategy): Promise<Strategy> {
    const [strategy] = await db.insert(strategies).values({
      id: randomUUID(),
      ...insertStrategy,
      progress: 0,
    }).returning();

    await this.createActivity({
      type: 'strategy_created',
      description: `Created strategy "${insertStrategy.title}"`,
      userId: insertStrategy.createdBy,
      strategyId: strategy.id,
      organizationId: insertStrategy.organizationId,
    });

    return strategy;
  }

  async updateStrategy(id: string, updates: Partial<Strategy>): Promise<Strategy | undefined> {
    const [strategy] = await db.update(strategies)
      .set(updates)
      .where(eq(strategies.id, id))
      .returning();
    return strategy || undefined;
  }

  async deleteStrategy(id: string): Promise<boolean> {
    await db.delete(userStrategyAssignments).where(eq(userStrategyAssignments.strategyId, id));
    await db.delete(projects).where(eq(projects.strategyId, id));
    await db.delete(actions).where(eq(actions.strategyId, id));
    await db.delete(activities).where(eq(activities.strategyId, id));
    const result = await db.delete(strategies).where(eq(strategies.id, id)).returning();
    return result.length > 0;
  }

  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project || undefined;
  }

  async getAllProjects(): Promise<Project[]> {
    return db.select().from(projects).where(isNull(projects.archivedAt));
  }

  async getProjectsByOrganization(organizationId: string): Promise<Project[]> {
    return db.select().from(projects).where(
      and(
        eq(projects.organizationId, organizationId),
        isNull(projects.archivedAt)
      )
    );
  }

  async getProjectsByStrategy(strategyId: string): Promise<Project[]> {
    return db.select().from(projects).where(
      and(
        eq(projects.strategyId, strategyId),
        isNull(projects.archivedAt)
      )
    );
  }

  async getProjectsByAssignee(assigneeId: string): Promise<Project[]> {
    const allProjects = await this.getAllProjects();
    return allProjects.filter(project => {
      try {
        const leaders = JSON.parse(project.accountableLeaders);
        return Array.isArray(leaders) && leaders.includes(assigneeId);
      } catch {
        return project.accountableLeaders === assigneeId;
      }
    });
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const [project] = await db.insert(projects).values({
      id: randomUUID(),
      ...insertProject,
      progress: 0,
    }).returning();

    await this.createActivity({
      type: 'project_created',
      description: `Created project "${insertProject.title}"`,
      userId: insertProject.createdBy,
      strategyId: insertProject.strategyId,
      projectId: project.id,
      organizationId: insertProject.organizationId,
    });

    return project;
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project | undefined> {
    const [project] = await db.update(projects)
      .set(updates)
      .where(eq(projects.id, id))
      .returning();
    return project || undefined;
  }

  async deleteProject(id: string): Promise<boolean> {
    await db.delete(actions).where(eq(actions.projectId, id));
    await db.delete(barriers).where(eq(barriers.projectId, id));
    const result = await db.delete(projects).where(eq(projects.id, id)).returning();
    return result.length > 0;
  }

  async getActivity(id: string): Promise<Activity | undefined> {
    const [activity] = await db.select().from(activities).where(eq(activities.id, id));
    return activity || undefined;
  }

  async getAllActivities(): Promise<Activity[]> {
    return db.select().from(activities).orderBy(desc(activities.createdAt));
  }

  async getActivitiesByOrganization(organizationId: string): Promise<Activity[]> {
    return db.select().from(activities)
      .where(eq(activities.organizationId, organizationId))
      .orderBy(desc(activities.createdAt));
  }

  async getActivitiesByUser(userId: string): Promise<Activity[]> {
    return db.select().from(activities)
      .where(eq(activities.userId, userId))
      .orderBy(desc(activities.createdAt));
  }

  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const [activity] = await db.insert(activities).values({
      id: randomUUID(),
      ...insertActivity,
    }).returning();
    return activity;
  }

  async getAction(id: string): Promise<Action | undefined> {
    const [action] = await db.select().from(actions).where(eq(actions.id, id));
    return action || undefined;
  }

  async getAllActions(): Promise<Action[]> {
    return db.select().from(actions);
  }

  async getActionsByOrganization(organizationId: string): Promise<Action[]> {
    return db.select().from(actions).where(eq(actions.organizationId, organizationId));
  }

  async getActionsByStrategy(strategyId: string): Promise<Action[]> {
    return db.select().from(actions).where(eq(actions.strategyId, strategyId));
  }

  async getActionsByProject(projectId: string): Promise<Action[]> {
    return db.select().from(actions).where(eq(actions.projectId, projectId));
  }

  async getActionsByWorkstream(workstreamId: string): Promise<Action[]> {
    return db.select().from(actions).where(eq(actions.workstreamId, workstreamId));
  }

  async getActionsByPhase(phaseId: string): Promise<Action[]> {
    return db.select().from(actions).where(eq(actions.phaseId, phaseId));
  }

  async getWorkstreamActionsByStrategy(strategyId: string): Promise<Action[]> {
    return db.select().from(actions).where(
      and(
        eq(actions.strategyId, strategyId),
        isNotNull(actions.workstreamId)
      )
    );
  }

  async createAction(insertAction: InsertAction): Promise<Action> {
    const [action] = await db.insert(actions).values({
      id: randomUUID(),
      ...insertAction,
    }).returning();

    await this.createActivity({
      type: 'action_created',
      description: `Created action "${insertAction.title}"`,
      userId: insertAction.createdBy,
      strategyId: insertAction.strategyId,
      projectId: insertAction.projectId,
      organizationId: insertAction.organizationId,
    });

    return action;
  }

  async updateAction(id: string, updates: Partial<Action>): Promise<Action | undefined> {
    const [action] = await db.update(actions)
      .set(updates)
      .where(eq(actions.id, id))
      .returning();
    return action || undefined;
  }

  async deleteAction(id: string): Promise<boolean> {
    await db.delete(actionDocuments).where(eq(actionDocuments.actionId, id));
    await db.delete(actionChecklistItems).where(eq(actionChecklistItems.actionId, id));
    const result = await db.delete(actions).where(eq(actions.id, id)).returning();
    return result.length > 0;
  }

  async recalculateProjectProgress(projectId: string): Promise<void> {
    const projectActions = await this.getActionsByProject(projectId);
    if (projectActions.length === 0) {
      await this.updateProject(projectId, { progress: 0 });
      return;
    }

    const completedActions = projectActions.filter(a => a.status === 'achieved').length;
    const progress = Math.round((completedActions / projectActions.length) * 100);
    await this.updateProject(projectId, { progress });

    const project = await this.getProject(projectId);
    if (project) {
      await this.recalculateStrategyProgress(project.strategyId);
    }
  }

  async recalculateStrategyProgress(strategyId: string): Promise<void> {
    const strategyProjects = await this.getProjectsByStrategy(strategyId);
    if (strategyProjects.length === 0) {
      await this.updateStrategy(strategyId, { progress: 0 });
      return;
    }

    const totalProgress = strategyProjects.reduce((sum, p) => sum + p.progress, 0);
    const avgProgress = Math.round(totalProgress / strategyProjects.length);
    
    // Get the current strategy to check its status
    const strategy = await this.getStrategy(strategyId);
    
    // Auto-complete: If progress is 100% and all projects are completed, set status to Completed
    // Only auto-complete if strategy is currently Active (don't revert from Archived)
    // Check for all possible completed status values (case-insensitive)
    const isProjectCompleted = (status: string | null) => {
      if (!status) return false;
      const normalizedStatus = status.toLowerCase();
      return normalizedStatus === 'achieved' || normalizedStatus === 'c' || normalizedStatus === 'completed';
    };
    const allProjectsCompleted = strategyProjects.every(p => isProjectCompleted(p.status));
    const isStrategyActive = strategy?.status?.toLowerCase() === 'active';
    const isStrategyCompleted = strategy?.status?.toLowerCase() === 'completed';
    const shouldAutoComplete = avgProgress === 100 && allProjectsCompleted && isStrategyActive;
    
    // Auto-revert: If strategy is Completed but progress drops below 100%, revert to Active
    // This handles cases where users change action status back from Achieved
    const shouldRevertToActive = isStrategyCompleted && avgProgress < 100;
    
    if (shouldAutoComplete) {
      await this.updateStrategy(strategyId, { progress: avgProgress, status: 'Completed' });
    } else if (shouldRevertToActive) {
      await this.updateStrategy(strategyId, { progress: avgProgress, status: 'Active' });
    } else {
      await this.updateStrategy(strategyId, { progress: avgProgress });
    }
  }

  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const [notification] = await db.insert(notifications).values({
      id: randomUUID(),
      ...insertNotification,
    }).returning();
    return notification;
  }

  async getNotificationsByUser(userId: string): Promise<Notification[]> {
    return db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async markNotificationAsRead(id: string): Promise<Notification | undefined> {
    const [notification] = await db.update(notifications)
      .set({ isRead: 'true' })
      .where(eq(notifications.id, id))
      .returning();
    return notification || undefined;
  }

  async markNotificationAsUnread(id: string): Promise<Notification | undefined> {
    const [notification] = await db.update(notifications)
      .set({ isRead: 'false' })
      .where(eq(notifications.id, id))
      .returning();
    return notification || undefined;
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    await db.update(notifications)
      .set({ isRead: 'true' })
      .where(eq(notifications.userId, userId));
  }

  async deleteNotification(id: string): Promise<boolean> {
    const result = await db.delete(notifications).where(eq(notifications.id, id)).returning();
    return result.length > 0;
  }

  async deleteDueDateNotificationsForAction(actionId: string): Promise<number> {
    const dueDateNotificationTypes = [
      'action_due_14_days',
      'action_due_7_days',
      'action_due_1_day',
      'action_overdue_1_day',
      'action_overdue_7_days'
    ];
    
    const result = await db.delete(notifications)
      .where(
        and(
          eq(notifications.relatedEntityId, actionId),
          eq(notifications.relatedEntityType, 'action'),
          inArray(notifications.type, dueDateNotificationTypes)
        )
      )
      .returning();
    return result.length;
  }

  async getActionDocuments(actionId: string): Promise<ActionDocument[]> {
    return db.select().from(actionDocuments).where(eq(actionDocuments.actionId, actionId));
  }

  async createActionDocument(insertDocument: InsertActionDocument): Promise<ActionDocument> {
    const [document] = await db.insert(actionDocuments).values({
      id: randomUUID(),
      ...insertDocument,
    }).returning();
    return document;
  }

  async updateActionDocument(id: string, updates: Partial<ActionDocument>): Promise<ActionDocument | undefined> {
    const [document] = await db.update(actionDocuments)
      .set(updates)
      .where(eq(actionDocuments.id, id))
      .returning();
    return document || undefined;
  }

  async deleteActionDocument(id: string): Promise<boolean> {
    const result = await db.delete(actionDocuments).where(eq(actionDocuments.id, id)).returning();
    return result.length > 0;
  }

  async getAllActionChecklistItems(): Promise<ActionChecklistItem[]> {
    return db.select().from(actionChecklistItems).orderBy(actionChecklistItems.orderIndex);
  }

  async getActionChecklistItems(actionId: string): Promise<ActionChecklistItem[]> {
    return db.select().from(actionChecklistItems)
      .where(eq(actionChecklistItems.actionId, actionId))
      .orderBy(actionChecklistItems.orderIndex);
  }

  async createActionChecklistItem(insertItem: CreateActionChecklistItem): Promise<ActionChecklistItem> {
    const [item] = await db.insert(actionChecklistItems).values({
      id: randomUUID(),
      ...insertItem,
    }).returning();
    return item;
  }

  async updateActionChecklistItem(id: string, updates: Partial<ActionChecklistItem>): Promise<ActionChecklistItem | undefined> {
    const [item] = await db.update(actionChecklistItems)
      .set(updates)
      .where(eq(actionChecklistItems.id, id))
      .returning();
    return item || undefined;
  }

  async deleteActionChecklistItem(id: string): Promise<boolean> {
    const result = await db.delete(actionChecklistItems).where(eq(actionChecklistItems.id, id)).returning();
    return result.length > 0;
  }

  async getUserStrategyAssignments(userId: string): Promise<UserStrategyAssignment[]> {
    return db.select().from(userStrategyAssignments).where(eq(userStrategyAssignments.userId, userId));
  }

  async getStrategyAssignments(strategyId: string): Promise<UserStrategyAssignment[]> {
    return db.select().from(userStrategyAssignments).where(eq(userStrategyAssignments.strategyId, strategyId));
  }

  async assignStrategy(userId: string, strategyId: string, assignedBy: string): Promise<UserStrategyAssignment> {
    const [assignment] = await db.insert(userStrategyAssignments).values({
      id: randomUUID(),
      userId,
      strategyId,
      assignedBy,
    }).returning();
    return assignment;
  }

  async unassignStrategy(userId: string, strategyId: string): Promise<boolean> {
    const result = await db.delete(userStrategyAssignments)
      .where(and(
        eq(userStrategyAssignments.userId, userId),
        eq(userStrategyAssignments.strategyId, strategyId)
      ))
      .returning();
    return result.length > 0;
  }

  async getUserAssignedStrategyIds(userId: string): Promise<string[]> {
    const assignments = await this.getUserStrategyAssignments(userId);
    return assignments.map(a => a.strategyId);
  }

  async getBarrier(id: string): Promise<Barrier | undefined> {
    const [barrier] = await db.select().from(barriers).where(eq(barriers.id, id));
    return barrier || undefined;
  }

  async getAllBarriers(organizationId?: string): Promise<Barrier[]> {
    if (organizationId) {
      return db.select().from(barriers).where(eq(barriers.organizationId, organizationId));
    }
    return db.select().from(barriers);
  }

  async getBarriersByProject(projectId: string, organizationId?: string): Promise<Barrier[]> {
    if (organizationId) {
      return db.select().from(barriers).where(
        and(eq(barriers.projectId, projectId), eq(barriers.organizationId, organizationId))
      );
    }
    return db.select().from(barriers).where(eq(barriers.projectId, projectId));
  }

  async createBarrier(insertBarrier: InsertBarrier & { createdBy: string; organizationId?: string | null }): Promise<Barrier> {
    const [barrier] = await db.insert(barriers).values({
      id: randomUUID(),
      title: insertBarrier.title,
      description: insertBarrier.description,
      projectId: insertBarrier.projectId,
      severity: insertBarrier.severity,
      status: insertBarrier.status,
      ownerId: insertBarrier.ownerId,
      targetResolutionDate: insertBarrier.targetResolutionDate,
      resolutionNotes: insertBarrier.resolutionNotes,
      createdBy: insertBarrier.createdBy,
      organizationId: insertBarrier.organizationId,
    }).returning();
    return barrier;
  }

  async updateBarrier(id: string, updates: Partial<Barrier>): Promise<Barrier | undefined> {
    const [barrier] = await db.update(barriers)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(barriers.id, id))
      .returning();
    return barrier || undefined;
  }

  async deleteBarrier(id: string): Promise<boolean> {
    const result = await db.delete(barriers).where(eq(barriers.id, id)).returning();
    return result.length > 0;
  }

  async getAllDependencies(organizationId?: string): Promise<Dependency[]> {
    if (organizationId) {
      return db.select().from(dependencies).where(eq(dependencies.organizationId, organizationId));
    }
    return db.select().from(dependencies);
  }

  async getDependenciesBySource(sourceType: string, sourceId: string, organizationId?: string): Promise<Dependency[]> {
    if (organizationId) {
      return db.select().from(dependencies)
        .where(and(
          eq(dependencies.sourceType, sourceType), 
          eq(dependencies.sourceId, sourceId),
          eq(dependencies.organizationId, organizationId)
        ));
    }
    return db.select().from(dependencies)
      .where(and(eq(dependencies.sourceType, sourceType), eq(dependencies.sourceId, sourceId)));
  }

  async getDependenciesByTarget(targetType: string, targetId: string, organizationId?: string): Promise<Dependency[]> {
    if (organizationId) {
      return db.select().from(dependencies)
        .where(and(
          eq(dependencies.targetType, targetType), 
          eq(dependencies.targetId, targetId),
          eq(dependencies.organizationId, organizationId)
        ));
    }
    return db.select().from(dependencies)
      .where(and(eq(dependencies.targetType, targetType), eq(dependencies.targetId, targetId)));
  }

  async createDependency(insertDependency: InsertDependency & { createdBy: string; organizationId?: string | null }): Promise<Dependency> {
    const [dependency] = await db.insert(dependencies).values({
      sourceType: insertDependency.sourceType,
      sourceId: insertDependency.sourceId,
      targetType: insertDependency.targetType,
      targetId: insertDependency.targetId,
      organizationId: insertDependency.organizationId,
      createdBy: insertDependency.createdBy,
    }).returning();
    return dependency;
  }

  async deleteDependency(id: string): Promise<boolean> {
    const result = await db.delete(dependencies).where(eq(dependencies.id, id)).returning();
    return result.length > 0;
  }

  async deleteDependenciesForEntities(projectIds: string[], actionIds: string[], organizationId?: string): Promise<number> {
    if (projectIds.length === 0 && actionIds.length === 0) {
      return 0;
    }

    const sourceConditions = [];
    const targetConditions = [];

    if (projectIds.length > 0) {
      sourceConditions.push(
        and(eq(dependencies.sourceType, 'project'), inArray(dependencies.sourceId, projectIds))
      );
      targetConditions.push(
        and(eq(dependencies.targetType, 'project'), inArray(dependencies.targetId, projectIds))
      );
    }

    if (actionIds.length > 0) {
      sourceConditions.push(
        and(eq(dependencies.sourceType, 'action'), inArray(dependencies.sourceId, actionIds))
      );
      targetConditions.push(
        and(eq(dependencies.targetType, 'action'), inArray(dependencies.targetId, actionIds))
      );
    }

    const allConditions = [...sourceConditions, ...targetConditions];

    if (allConditions.length === 0) {
      return 0;
    }

    const entityFilter = or(...allConditions);
    const finalCondition = organizationId 
      ? and(entityFilter, eq(dependencies.organizationId, organizationId))
      : entityFilter;

    const result = await db.delete(dependencies)
      .where(finalCondition)
      .returning();

    return result.length;
  }

  async getAllTemplateTypes(): Promise<TemplateType[]> {
    return db.select().from(templateTypes).orderBy(templateTypes.displayOrder);
  }

  async createTemplateType(insertTemplateType: InsertTemplateType): Promise<TemplateType> {
    const [templateType] = await db.insert(templateTypes).values({
      id: randomUUID(),
      ...insertTemplateType,
    }).returning();
    return templateType;
  }

  async deleteTemplateType(id: string): Promise<boolean> {
    const result = await db.delete(templateTypes).where(eq(templateTypes.id, id)).returning();
    return result.length > 0;
  }

  async getExecutiveGoalsByOrganization(organizationId: string): Promise<ExecutiveGoal[]> {
    return db.select().from(executiveGoals)
      .where(eq(executiveGoals.organizationId, organizationId))
      .orderBy(executiveGoals.createdAt);
  }

  async createExecutiveGoal(goal: InsertExecutiveGoal & { organizationId: string; createdBy: string }): Promise<ExecutiveGoal> {
    const [executiveGoal] = await db.insert(executiveGoals).values({
      id: randomUUID(),
      name: goal.name,
      description: goal.description,
      organizationId: goal.organizationId,
      createdBy: goal.createdBy,
    }).returning();
    return executiveGoal;
  }

  async updateExecutiveGoal(id: string, updates: Partial<InsertExecutiveGoal>): Promise<ExecutiveGoal | undefined> {
    const [executiveGoal] = await db.update(executiveGoals)
      .set(updates)
      .where(eq(executiveGoals.id, id))
      .returning();
    return executiveGoal || undefined;
  }

  async deleteExecutiveGoal(id: string): Promise<boolean> {
    const result = await db.delete(executiveGoals).where(eq(executiveGoals.id, id)).returning();
    return result.length > 0;
  }

  async getExecutiveGoal(id: string): Promise<ExecutiveGoal | undefined> {
    const [goal] = await db.select().from(executiveGoals).where(eq(executiveGoals.id, id));
    return goal || undefined;
  }

  async getStrategyExecutiveGoals(strategyId: string): Promise<StrategyExecutiveGoal[]> {
    return db.select().from(strategyExecutiveGoals)
      .where(eq(strategyExecutiveGoals.strategyId, strategyId));
  }

  async setStrategyExecutiveGoals(strategyId: string, goalIds: string[], organizationId: string): Promise<StrategyExecutiveGoal[]> {
    await db.delete(strategyExecutiveGoals).where(eq(strategyExecutiveGoals.strategyId, strategyId));
    
    if (goalIds.length === 0) {
      return [];
    }
    
    const values = goalIds.map(goalId => ({
      id: randomUUID(),
      strategyId,
      executiveGoalId: goalId,
      organizationId,
    }));
    
    return db.insert(strategyExecutiveGoals).values(values).returning();
  }

  async getTeamTagsByOrganization(organizationId: string): Promise<TeamTag[]> {
    return db.select().from(teamTags)
      .where(eq(teamTags.organizationId, organizationId))
      .orderBy(teamTags.name);
  }

  async getTeamTag(id: string): Promise<TeamTag | undefined> {
    const [tag] = await db.select().from(teamTags).where(eq(teamTags.id, id));
    return tag || undefined;
  }

  async createTeamTag(tag: InsertTeamTag & { organizationId: string; createdBy: string }): Promise<TeamTag> {
    const [teamTag] = await db.insert(teamTags).values({
      id: randomUUID(),
      name: tag.name,
      colorHex: tag.colorHex || '#3B82F6',
      organizationId: tag.organizationId,
      createdBy: tag.createdBy,
    }).returning();
    return teamTag;
  }

  async updateTeamTag(id: string, updates: Partial<InsertTeamTag>): Promise<TeamTag | undefined> {
    const [teamTag] = await db.update(teamTags)
      .set(updates)
      .where(eq(teamTags.id, id))
      .returning();
    return teamTag || undefined;
  }

  async deleteTeamTag(id: string): Promise<boolean> {
    await db.delete(projectTeamTags).where(eq(projectTeamTags.teamTagId, id));
    const result = await db.delete(teamTags).where(eq(teamTags.id, id)).returning();
    return result.length > 0;
  }

  async getProjectTeamTags(projectId: string): Promise<ProjectTeamTag[]> {
    return db.select().from(projectTeamTags)
      .where(eq(projectTeamTags.projectId, projectId));
  }

  async setProjectTeamTags(projectId: string, tagIds: string[], organizationId: string): Promise<ProjectTeamTag[]> {
    await db.delete(projectTeamTags).where(eq(projectTeamTags.projectId, projectId));
    
    if (tagIds.length === 0) {
      return [];
    }
    
    const values = tagIds.map(tagId => ({
      id: randomUUID(),
      projectId,
      teamTagId: tagId,
      organizationId,
    }));
    
    return db.insert(projectTeamTags).values(values).returning();
  }

  async getProjectsByTeamTag(teamTagId: string, organizationId: string): Promise<Project[]> {
    const assignments = await db.select().from(projectTeamTags)
      .where(and(
        eq(projectTeamTags.teamTagId, teamTagId),
        eq(projectTeamTags.organizationId, organizationId)
      ));
    
    if (assignments.length === 0) {
      return [];
    }
    
    const projectIds = assignments.map(a => a.projectId);
    return db.select().from(projects).where(inArray(projects.id, projectIds));
  }

  // User Team Tag methods (for tagging users to teams)
  async getUserTeamTags(userId: string, organizationId: string): Promise<UserTeamTag[]> {
    return db.select().from(userTeamTags)
      .where(and(
        eq(userTeamTags.userId, userId),
        eq(userTeamTags.organizationId, organizationId)
      ));
  }

  async setUserTeamTags(userId: string, tagIds: string[], organizationId: string, primaryTagId?: string): Promise<UserTeamTag[]> {
    // Get existing assignments to preserve primary if possible
    const existingTags = await db.select().from(userTeamTags).where(and(
      eq(userTeamTags.userId, userId),
      eq(userTeamTags.organizationId, organizationId)
    ));
    
    // Find existing primary tag
    const existingPrimaryId = existingTags.find(t => t.isPrimary)?.teamTagId;
    
    // Delete existing assignments for this user within the same organization only
    await db.delete(userTeamTags).where(and(
      eq(userTeamTags.userId, userId),
      eq(userTeamTags.organizationId, organizationId)
    ));
    
    if (tagIds.length === 0) {
      return [];
    }
    
    // Determine which tag should be primary:
    // 1. If explicitly specified and in the list, use it
    // 2. If existing primary is still in the list, keep it
    // 3. Otherwise, first tag in the list becomes primary
    let actualPrimaryId: string;
    if (primaryTagId && tagIds.includes(primaryTagId)) {
      actualPrimaryId = primaryTagId;
    } else if (existingPrimaryId && tagIds.includes(existingPrimaryId)) {
      actualPrimaryId = existingPrimaryId;
    } else {
      actualPrimaryId = tagIds[0];
    }
    
    const values = tagIds.map(tagId => ({
      id: randomUUID(),
      userId,
      teamTagId: tagId,
      organizationId,
      isPrimary: tagId === actualPrimaryId,
    }));
    
    return db.insert(userTeamTags).values(values).returning();
  }
  
  async setUserPrimaryTeam(userId: string, teamTagId: string, organizationId: string): Promise<void> {
    // First, unset all primary flags for this user
    await db.update(userTeamTags)
      .set({ isPrimary: false })
      .where(and(
        eq(userTeamTags.userId, userId),
        eq(userTeamTags.organizationId, organizationId)
      ));
    
    // Then set the specified team as primary
    await db.update(userTeamTags)
      .set({ isPrimary: true })
      .where(and(
        eq(userTeamTags.userId, userId),
        eq(userTeamTags.teamTagId, teamTagId),
        eq(userTeamTags.organizationId, organizationId)
      ));
  }

  async getUsersByTeamTag(teamTagId: string, organizationId: string): Promise<User[]> {
    const assignments = await db.select().from(userTeamTags)
      .where(and(
        eq(userTeamTags.teamTagId, teamTagId),
        eq(userTeamTags.organizationId, organizationId)
      ));
    
    if (assignments.length === 0) {
      return [];
    }
    
    const userIds = assignments.map(a => a.userId);
    return db.select().from(users).where(inArray(users.id, userIds));
  }

  async getUserTeamTagsByOrganization(organizationId: string): Promise<UserTeamTag[]> {
    return db.select().from(userTeamTags)
      .where(eq(userTeamTags.organizationId, organizationId));
  }

  // Project Resource Assignment methods (for capacity planning)
  async getProjectResourceAssignments(projectId: string): Promise<ProjectResourceAssignment[]> {
    return db.select().from(projectResourceAssignments)
      .where(eq(projectResourceAssignments.projectId, projectId));
  }

  async getResourceAssignmentsByUser(userId: string, organizationId: string): Promise<ProjectResourceAssignment[]> {
    return db.select().from(projectResourceAssignments)
      .where(and(
        eq(projectResourceAssignments.userId, userId),
        eq(projectResourceAssignments.organizationId, organizationId)
      ));
  }

  async getResourceAssignmentsByOrganization(organizationId: string): Promise<ProjectResourceAssignment[]> {
    return db.select().from(projectResourceAssignments)
      .where(eq(projectResourceAssignments.organizationId, organizationId));
  }

  async upsertProjectResourceAssignment(assignment: InsertProjectResourceAssignment): Promise<ProjectResourceAssignment> {
    const [result] = await db.insert(projectResourceAssignments).values({
      id: randomUUID(),
      ...assignment,
    }).onConflictDoUpdate({
      target: [projectResourceAssignments.projectId, projectResourceAssignments.userId],
      set: {
        hoursPerWeek: assignment.hoursPerWeek,
        updatedAt: new Date(),
      }
    }).returning();
    return result;
  }

  async deleteProjectResourceAssignment(projectId: string, userId: string): Promise<boolean> {
    const result = await db.delete(projectResourceAssignments)
      .where(and(
        eq(projectResourceAssignments.projectId, projectId),
        eq(projectResourceAssignments.userId, userId)
      ));
    return true;
  }

  // Action People Assignment methods (for to-do list tagging, no hours)
  async getActionPeopleAssignments(actionId: string): Promise<ActionPeopleAssignment[]> {
    return db.select().from(actionPeopleAssignments)
      .where(eq(actionPeopleAssignments.actionId, actionId));
  }

  async getActionPeopleAssignmentsByOrganization(organizationId: string): Promise<ActionPeopleAssignment[]> {
    return db.select().from(actionPeopleAssignments)
      .where(eq(actionPeopleAssignments.organizationId, organizationId));
  }

  async getActionPeopleAssignmentsByUser(userId: string, organizationId: string): Promise<ActionPeopleAssignment[]> {
    return db.select().from(actionPeopleAssignments)
      .where(and(
        eq(actionPeopleAssignments.userId, userId),
        eq(actionPeopleAssignments.organizationId, organizationId)
      ));
  }

  async createActionPeopleAssignment(assignment: InsertActionPeopleAssignment): Promise<ActionPeopleAssignment> {
    const [created] = await db.insert(actionPeopleAssignments)
      .values({ ...assignment, id: randomUUID() })
      .returning();
    return created;
  }

  async deleteActionPeopleAssignment(actionId: string, userId: string): Promise<boolean> {
    await db.delete(actionPeopleAssignments)
      .where(and(
        eq(actionPeopleAssignments.actionId, actionId),
        eq(actionPeopleAssignments.userId, userId)
      ));
    return true;
  }

  async getPtoEntriesByUser(userId: string): Promise<PtoEntry[]> {
    return db.select().from(ptoEntries).where(eq(ptoEntries.userId, userId)).orderBy(desc(ptoEntries.startDate));
  }

  async getPtoEntriesByOrganization(organizationId: string): Promise<PtoEntry[]> {
    return db.select().from(ptoEntries).where(eq(ptoEntries.organizationId, organizationId)).orderBy(desc(ptoEntries.startDate));
  }

  async getPtoEntry(id: string): Promise<PtoEntry | undefined> {
    const [entry] = await db.select().from(ptoEntries).where(eq(ptoEntries.id, id));
    return entry || undefined;
  }

  async createPtoEntry(entry: InsertPtoEntry & { userId: string; organizationId: string }): Promise<PtoEntry> {
    const [created] = await db.insert(ptoEntries).values({
      id: randomUUID(),
      ...entry,
    }).returning();
    return created;
  }

  async updatePtoEntry(id: string, updates: Partial<InsertPtoEntry>): Promise<PtoEntry | undefined> {
    const [updated] = await db.update(ptoEntries)
      .set(updates)
      .where(eq(ptoEntries.id, id))
      .returning();
    return updated || undefined;
  }

  async deletePtoEntry(id: string): Promise<boolean> {
    await db.delete(ptoEntries).where(eq(ptoEntries.id, id));
    return true;
  }

  // Holiday methods
  async getHolidaysByOrganization(organizationId: string): Promise<Holiday[]> {
    return db.select().from(holidays).where(eq(holidays.organizationId, organizationId)).orderBy(desc(holidays.date));
  }

  async getHoliday(id: string): Promise<Holiday | undefined> {
    const [holiday] = await db.select().from(holidays).where(eq(holidays.id, id));
    return holiday || undefined;
  }

  async createHoliday(holiday: InsertHoliday & { organizationId: string }): Promise<Holiday> {
    const [created] = await db.insert(holidays).values({
      id: randomUUID(),
      ...holiday,
    }).returning();
    return created;
  }

  async updateHoliday(id: string, updates: Partial<InsertHoliday>): Promise<Holiday | undefined> {
    const [updated] = await db.update(holidays)
      .set(updates)
      .where(eq(holidays.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteHoliday(id: string): Promise<boolean> {
    await db.delete(holidays).where(eq(holidays.id, id));
    return true;
  }

  // Project Snapshot methods
  async getProjectSnapshots(projectId: string): Promise<ProjectSnapshot[]> {
    return db.select().from(projectSnapshots)
      .where(eq(projectSnapshots.projectId, projectId))
      .orderBy(desc(projectSnapshots.createdAt));
  }

  async createProjectSnapshot(snapshot: InsertProjectSnapshot): Promise<ProjectSnapshot> {
    const [newSnapshot] = await db.insert(projectSnapshots).values({
      ...snapshot,
      id: randomUUID(),
    }).returning();
    return newSnapshot;
  }

  // Project Archive methods
  async getArchivedProjectsByOrganization(organizationId: string): Promise<Project[]> {
    return db.select().from(projects)
      .where(and(
        eq(projects.organizationId, organizationId),
        eq(projects.isArchived, 'true')
      ))
      .orderBy(desc(projects.archivedAt));
  }

  async archiveProject(projectId: string, archivedBy: string, reason?: string, wakeUpDate?: Date): Promise<Project | undefined> {
    // Get the project first
    const project = await this.getProject(projectId);
    if (!project) return undefined;

    // Get all actions for this project to include in snapshot
    const projectActions = await this.getActionsByProject(projectId);

    // Create a snapshot of the current state before archiving
    await this.createProjectSnapshot({
      projectId,
      snapshotData: JSON.stringify({ project, actions: projectActions }),
      snapshotType: 'archive',
      reason: reason || 'Project archived',
      createdBy: archivedBy,
      organizationId: project.organizationId,
    });

    // Archive all actions under this project
    for (const action of projectActions) {
      await db.update(actions)
        .set({ isArchived: 'true' })
        .where(eq(actions.id, action.id));
    }

    // Remove dependencies involving this project or its actions
    const actionIds = projectActions.map(a => a.id);
    if (project.organizationId) {
      await this.deleteDependenciesForEntities([projectId], actionIds, project.organizationId);
    }

    // Update the project with archive info
    const [archivedProject] = await db.update(projects)
      .set({
        isArchived: 'true',
        archiveReason: reason || null,
        archivedAt: new Date(),
        archivedBy,
        progressAtArchive: project.progress,
        wakeUpDate: wakeUpDate || null,
      })
      .where(eq(projects.id, projectId))
      .returning();

    return archivedProject;
  }

  async unarchiveProject(projectId: string, restoredBy: string): Promise<Project | undefined> {
    // Get the project first
    const project = await this.getProject(projectId);
    if (!project) return undefined;

    // Get all actions for this project
    const projectActions = await this.getActionsByProject(projectId);

    // Create a snapshot of the archived state before unarchiving
    await this.createProjectSnapshot({
      projectId,
      snapshotData: JSON.stringify({ project, actions: projectActions }),
      snapshotType: 'unarchive',
      reason: 'Project restored from archive',
      createdBy: restoredBy,
      organizationId: project.organizationId,
    });

    // Unarchive all actions under this project
    for (const action of projectActions) {
      await db.update(actions)
        .set({ isArchived: 'false' })
        .where(eq(actions.id, action.id));
    }

    // Update the project - clear archive info but keep progressAtArchive for history
    const [restoredProject] = await db.update(projects)
      .set({
        isArchived: 'false',
        archiveReason: null,
        archivedAt: null,
        archivedBy: null,
        wakeUpDate: null,
      })
      .where(eq(projects.id, projectId))
      .returning();

    return restoredProject;
  }

  async copyProject(projectId: string, newTitle: string, createdBy: string, asTemplate: boolean = false): Promise<Project | undefined> {
    // Get the source project
    const sourceProject = await this.getProject(projectId);
    if (!sourceProject) return undefined;

    // Get all actions for the source project
    const sourceActions = await this.getActionsByProject(projectId);

    // Create the new project
    const newProjectId = randomUUID();
    const now = new Date();
    
    // Calculate date offset if copying as regular project (not template)
    const dayOffset = asTemplate ? 0 : Math.ceil((now.getTime() - new Date(sourceProject.startDate).getTime()) / (1000 * 60 * 60 * 24));

    const [newProject] = await db.insert(projects).values({
      id: newProjectId,
      title: newTitle,
      description: sourceProject.description,
      strategyId: sourceProject.strategyId,
      kpi: sourceProject.kpi,
      kpiTracking: asTemplate ? null : sourceProject.kpiTracking,
      accountableLeaders: sourceProject.accountableLeaders,
      resourcesRequired: sourceProject.resourcesRequired,
      startDate: asTemplate ? now : new Date(new Date(sourceProject.startDate).getTime() + dayOffset * 24 * 60 * 60 * 1000),
      dueDate: asTemplate ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) : new Date(new Date(sourceProject.dueDate).getTime() + dayOffset * 24 * 60 * 60 * 1000),
      status: 'NYS',
      progress: asTemplate ? 0 : 0,
      isArchived: 'false',
      documentFolderUrl: sourceProject.documentFolderUrl,
      communicationUrl: sourceProject.communicationUrl,
      organizationId: sourceProject.organizationId,
      createdBy,
    }).returning();

    // Copy all actions
    for (const sourceAction of sourceActions) {
      const newActionDueDate = sourceAction.dueDate 
        ? (asTemplate 
            ? new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000) 
            : new Date(new Date(sourceAction.dueDate).getTime() + dayOffset * 24 * 60 * 60 * 1000))
        : null;

      await db.insert(actions).values({
        id: randomUUID(),
        title: sourceAction.title,
        description: sourceAction.description,
        strategyId: sourceAction.strategyId,
        projectId: newProjectId,
        targetValue: sourceAction.targetValue,
        currentValue: asTemplate ? null : sourceAction.currentValue,
        measurementUnit: sourceAction.measurementUnit,
        status: asTemplate ? 'not_started' : 'not_started',
        dueDate: newActionDueDate,
        isArchived: 'false',
        documentFolderUrl: sourceAction.documentFolderUrl,
        notes: asTemplate ? null : sourceAction.notes,
        organizationId: sourceAction.organizationId,
        createdBy,
      });
    }

    return newProject;
  }

  // Intake Form methods
  async getIntakeFormsByOrganization(organizationId: string): Promise<IntakeForm[]> {
    return db.select().from(intakeForms)
      .where(eq(intakeForms.organizationId, organizationId))
      .orderBy(desc(intakeForms.createdAt));
  }

  async getIntakeForm(id: string): Promise<IntakeForm | undefined> {
    const [form] = await db.select().from(intakeForms).where(eq(intakeForms.id, id));
    return form || undefined;
  }

  async getIntakeFormBySlug(slug: string): Promise<IntakeForm | undefined> {
    const [form] = await db.select().from(intakeForms).where(eq(intakeForms.slug, slug));
    return form || undefined;
  }

  async createIntakeForm(form: InsertIntakeForm & { createdBy: string; organizationId: string }): Promise<IntakeForm> {
    const [created] = await db.insert(intakeForms).values({
      id: randomUUID(),
      ...form,
    }).returning();
    return created;
  }

  async updateIntakeForm(id: string, updates: Partial<IntakeForm>): Promise<IntakeForm | undefined> {
    const [form] = await db.update(intakeForms)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(intakeForms.id, id))
      .returning();
    return form || undefined;
  }

  async deleteIntakeForm(id: string): Promise<boolean> {
    await db.delete(intakeSubmissions).where(eq(intakeSubmissions.formId, id));
    const result = await db.delete(intakeForms).where(eq(intakeForms.id, id)).returning();
    return result.length > 0;
  }

  // Intake Submission methods
  async getIntakeSubmissionsByOrganization(organizationId: string): Promise<IntakeSubmission[]> {
    return db.select().from(intakeSubmissions)
      .where(eq(intakeSubmissions.organizationId, organizationId))
      .orderBy(desc(intakeSubmissions.submittedAt));
  }

  async getIntakeSubmissionsByForm(formId: string): Promise<IntakeSubmission[]> {
    return db.select().from(intakeSubmissions)
      .where(eq(intakeSubmissions.formId, formId))
      .orderBy(desc(intakeSubmissions.submittedAt));
  }

  async getIntakeSubmission(id: string): Promise<IntakeSubmission | undefined> {
    const [submission] = await db.select().from(intakeSubmissions).where(eq(intakeSubmissions.id, id));
    return submission || undefined;
  }

  async createIntakeSubmission(submission: InsertIntakeSubmission & { status?: string; assignedStrategyId?: string; assignedProjectId?: string }): Promise<IntakeSubmission> {
    const [created] = await db.insert(intakeSubmissions).values({
      id: randomUUID(),
      ...submission,
    }).returning();
    return created;
  }

  async updateIntakeSubmission(id: string, updates: Partial<IntakeSubmission>): Promise<IntakeSubmission | undefined> {
    const [submission] = await db.update(intakeSubmissions)
      .set(updates)
      .where(eq(intakeSubmissions.id, id))
      .returning();
    return submission || undefined;
  }

  async countSubmissionsByEmail(formId: string, email: string): Promise<number> {
    const results = await db.select().from(intakeSubmissions)
      .where(and(
        eq(intakeSubmissions.formId, formId),
        eq(intakeSubmissions.submitterEmail, email.toLowerCase())
      ));
    return results.length;
  }

  async countTotalSubmissions(formId: string): Promise<number> {
    const results = await db.select().from(intakeSubmissions)
      .where(eq(intakeSubmissions.formId, formId));
    return results.length;
  }

  async getDecisionsByOrganization(organizationId: string): Promise<Decision[]> {
    return db.select().from(decisions)
      .where(eq(decisions.organizationId, organizationId))
      .orderBy(desc(decisions.createdAt));
  }

  async getDecision(id: string): Promise<Decision | undefined> {
    const [decision] = await db.select().from(decisions).where(eq(decisions.id, id));
    return decision || undefined;
  }

  async createDecision(decision: InsertDecision & { createdBy: string; organizationId: string }): Promise<Decision> {
    const [created] = await db.insert(decisions).values({
      id: randomUUID(),
      ...decision,
    }).returning();
    return created;
  }

  async updateDecision(id: string, updates: Partial<Decision>): Promise<Decision | undefined> {
    const [decision] = await db.update(decisions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(decisions.id, id))
      .returning();
    return decision || undefined;
  }

  async deleteDecision(id: string): Promise<boolean> {
    await db.delete(decisionRaciAssignments).where(eq(decisionRaciAssignments.decisionId, id));
    const result = await db.delete(decisions).where(eq(decisions.id, id)).returning();
    return result.length > 0;
  }

  async getDecisionRaciAssignments(decisionId: string): Promise<DecisionRaci[]> {
    return db.select().from(decisionRaciAssignments)
      .where(eq(decisionRaciAssignments.decisionId, decisionId));
  }

  async setDecisionRaciAssignments(decisionId: string, assignments: InsertDecisionRaci[]): Promise<DecisionRaci[]> {
    await db.delete(decisionRaciAssignments).where(eq(decisionRaciAssignments.decisionId, decisionId));
    if (assignments.length === 0) return [];
    const toInsert = assignments.map(a => ({
      id: randomUUID(),
      decisionId,
      userId: a.userId,
      role: a.role,
    }));
    return db.insert(decisionRaciAssignments).values(toInsert).returning();
  }

  // Workstream methods
  async getWorkstreamsByStrategy(strategyId: string): Promise<Workstream[]> {
    return db.select().from(workstreams)
      .where(eq(workstreams.strategyId, strategyId))
      .orderBy(workstreams.sortOrder);
  }

  async getWorkstream(id: string): Promise<Workstream | undefined> {
    const [ws] = await db.select().from(workstreams).where(eq(workstreams.id, id));
    return ws || undefined;
  }

  async createWorkstream(workstream: InsertWorkstream & { organizationId: string }): Promise<Workstream> {
    const [created] = await db.insert(workstreams).values({
      id: randomUUID(),
      ...workstream,
    }).returning();
    return created;
  }

  async updateWorkstream(id: string, updates: Partial<Workstream>): Promise<Workstream | undefined> {
    const [ws] = await db.update(workstreams)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(workstreams.id, id))
      .returning();
    return ws || undefined;
  }

  async deleteWorkstream(id: string): Promise<boolean> {
    const wsActions = await db.select().from(actions).where(eq(actions.workstreamId, id));
    for (const task of wsActions) {
      await db.delete(gateCriteria).where(eq(gateCriteria.gateTaskId, task.id));
      await db.delete(workstreamDependencies).where(
        or(
          eq(workstreamDependencies.predecessorTaskId, task.id),
          eq(workstreamDependencies.successorTaskId, task.id)
        )
      );
    }
    const result = await db.delete(workstreams).where(eq(workstreams.id, id)).returning();
    return result.length > 0;
  }

  // Phase methods
  async getPhasesByStrategy(strategyId: string): Promise<Phase[]> {
    return db.select().from(phases)
      .where(eq(phases.strategyId, strategyId))
      .orderBy(phases.sequence);
  }

  async getPhasesByOrganization(organizationId: string): Promise<Phase[]> {
    return db.select().from(phases)
      .where(eq(phases.organizationId, organizationId))
      .orderBy(phases.sequence);
  }

  async getPhase(id: string): Promise<Phase | undefined> {
    const [phase] = await db.select().from(phases).where(eq(phases.id, id));
    return phase || undefined;
  }

  async createPhase(phase: InsertPhase & { organizationId: string }): Promise<Phase> {
    const [created] = await db.insert(phases).values({
      id: randomUUID(),
      ...phase,
    }).returning();
    return created;
  }

  async updatePhase(id: string, updates: Partial<Phase>): Promise<Phase | undefined> {
    const [phase] = await db.update(phases)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(phases.id, id))
      .returning();
    return phase || undefined;
  }

  async deletePhase(id: string): Promise<boolean> {
    const phaseActions = await db.select().from(actions).where(eq(actions.phaseId, id));
    for (const task of phaseActions) {
      await db.delete(gateCriteria).where(eq(gateCriteria.gateTaskId, task.id));
      await db.delete(workstreamDependencies).where(
        or(
          eq(workstreamDependencies.predecessorTaskId, task.id),
          eq(workstreamDependencies.successorTaskId, task.id)
        )
      );
    }
    const result = await db.delete(phases).where(eq(phases.id, id)).returning();
    return result.length > 0;
  }

  // Workstream Dependency methods
  async getWorkstreamDependenciesByTask(taskId: string): Promise<WorkstreamDependency[]> {
    return db.select().from(workstreamDependencies)
      .where(
        or(
          eq(workstreamDependencies.predecessorTaskId, taskId),
          eq(workstreamDependencies.successorTaskId, taskId)
        )
      );
  }

  async getWorkstreamDependenciesByStrategy(strategyId: string): Promise<WorkstreamDependency[]> {
    const strategyWorkstreams = await db.select({ id: workstreams.id }).from(workstreams)
      .where(eq(workstreams.strategyId, strategyId));
    if (strategyWorkstreams.length === 0) return [];
    const wsIds = strategyWorkstreams.map(w => w.id);
    const tasks = await db.select({ id: actions.id }).from(actions)
      .where(inArray(actions.workstreamId, wsIds));
    if (tasks.length === 0) return [];
    const taskIds = tasks.map(t => t.id);
    return db.select().from(workstreamDependencies)
      .where(
        or(
          inArray(workstreamDependencies.predecessorTaskId, taskIds),
          inArray(workstreamDependencies.successorTaskId, taskIds)
        )
      );
  }

  async createWorkstreamDependency(dep: InsertWorkstreamDependency): Promise<WorkstreamDependency> {
    const [created] = await db.insert(workstreamDependencies).values({
      id: randomUUID(),
      ...dep,
    }).returning();
    return created;
  }

  async deleteWorkstreamDependency(id: string): Promise<boolean> {
    const result = await db.delete(workstreamDependencies).where(eq(workstreamDependencies.id, id)).returning();
    return result.length > 0;
  }

  // Gate Criteria methods
  async getGateCriteriaByTask(gateTaskId: string): Promise<GateCriteria[]> {
    return db.select().from(gateCriteria)
      .where(eq(gateCriteria.gateTaskId, gateTaskId));
  }

  async createGateCriteria(criteria: InsertGateCriteria): Promise<GateCriteria> {
    const [created] = await db.insert(gateCriteria).values({
      id: randomUUID(),
      ...criteria,
    }).returning();
    return created;
  }

  async updateGateCriteria(id: string, updates: Partial<GateCriteria>): Promise<GateCriteria | undefined> {
    const [criteria] = await db.update(gateCriteria)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(gateCriteria.id, id))
      .returning();
    return criteria || undefined;
  }

  async deleteGateCriteria(id: string): Promise<boolean> {
    const result = await db.delete(gateCriteria).where(eq(gateCriteria.id, id)).returning();
    return result.length > 0;
  }
}

export async function getAllOrganizations(): Promise<Organization[]> {
  return db.select().from(organizations).orderBy(organizations.createdAt);
}

export async function getOrganization(id: string): Promise<Organization | undefined> {
  const [org] = await db.select().from(organizations).where(eq(organizations.id, id));
  return org || undefined;
}

export async function getOrganizationByToken(token: string): Promise<Organization | undefined> {
  const [org] = await db.select().from(organizations).where(eq(organizations.registrationToken, token));
  return org || undefined;
}

export async function createOrganization(name: string): Promise<Organization> {
  const token = randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, '').substring(0, 8);
  const [org] = await db.insert(organizations).values({
    id: randomUUID(),
    name,
    registrationToken: token,
  }).returning();
  return org;
}

export async function updateOrganizationToken(id: string): Promise<Organization | undefined> {
  const newToken = randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, '').substring(0, 8);
  const [org] = await db.update(organizations)
    .set({ registrationToken: newToken })
    .where(eq(organizations.id, id))
    .returning();
  return org || undefined;
}

export async function updateOrganizationName(id: string, name: string): Promise<Organization | undefined> {
  const [org] = await db.update(organizations)
    .set({ name, updatedAt: new Date() })
    .where(eq(organizations.id, id))
    .returning();
  return org || undefined;
}

export async function deleteOrganization(id: string): Promise<boolean> {
  const result = await db.delete(organizations).where(eq(organizations.id, id)).returning();
  return result.length > 0;
}

export async function ensureDefaultOrganization(): Promise<void> {
  const orgs = await getAllOrganizations();
  if (orgs.length === 0) {
    await createOrganization('Default Organization');
    console.log('[DB] Created default organization');
  }
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
  return user || undefined;
}

export async function getUsersByOrganization(organizationId: string): Promise<User[]> {
  return db.select().from(users).where(eq(users.organizationId, organizationId));
}

export async function updateUserPassword(userId: string, passwordHash: string): Promise<void> {
  await db.update(users).set({ passwordHash }).where(eq(users.id, userId));
}

export async function clearMustChangePassword(userId: string): Promise<void> {
  await db.update(users).set({ mustChangePassword: 'false' }).where(eq(users.id, userId));
}

export async function setupSuperAdmin(): Promise<void> {
  const superAdminEmails = process.env.SUPER_ADMIN_EMAILS?.split(',').map(e => e.trim().toLowerCase()) || [];
  
  if (superAdminEmails.length > 0) {
    for (const email of superAdminEmails) {
      const [user] = await db.select().from(users).where(eq(users.email, email));
      if (user) {
        await db.update(users).set({ isSuperAdmin: 'true' }).where(eq(users.email, email));
        console.log(`[INFO] Set ${email} as Super Admin`);
      }
    }
  } else {
    const [existingSuperAdmin] = await db.select().from(users).where(eq(users.isSuperAdmin, 'true'));
    if (!existingSuperAdmin) {
      const [firstUser] = await db.select().from(users).orderBy(users.createdAt).limit(1);
      if (firstUser) {
        await db.update(users).set({ isSuperAdmin: 'true' }).where(eq(users.id, firstUser.id));
        console.log(`[INFO] Set first user (${firstUser.email}) as Super Admin (no SUPER_ADMIN_EMAILS configured)`);
      }
    }
  }
}

// Password Reset Token Functions
export async function createPasswordResetToken(
  userId: string, 
  tokenHash: string, 
  expiresAt: Date
): Promise<PasswordResetToken> {
  // Invalidate any existing tokens for this user
  await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));
  
  const [token] = await db.insert(passwordResetTokens).values({
    userId,
    tokenHash,
    expiresAt,
  }).returning();
  
  return token;
}

export async function getPasswordResetToken(tokenHash: string): Promise<PasswordResetToken | undefined> {
  const [token] = await db.select()
    .from(passwordResetTokens)
    .where(eq(passwordResetTokens.tokenHash, tokenHash));
  return token || undefined;
}

export async function markPasswordResetTokenUsed(tokenId: string): Promise<void> {
  await db.update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(eq(passwordResetTokens.id, tokenId));
}

export async function cleanupExpiredTokens(): Promise<void> {
  await db.delete(passwordResetTokens)
    .where(sql`${passwordResetTokens.expiresAt} < (strftime('%s','now') * 1000) OR ${passwordResetTokens.usedAt} IS NOT NULL`);
}

// Two-Factor Authentication Code Functions
export async function createTwoFactorCode(
  userId: string,
  codeHash: string,
  type: 'login' | 'setup',
  expiresAt: Date,
  organizationId: string | null
): Promise<TwoFactorCode> {
  // Invalidate any existing codes of the same type for this user
  await db.delete(twoFactorCodes).where(
    and(
      eq(twoFactorCodes.userId, userId),
      eq(twoFactorCodes.type, type)
    )
  );
  
  const [code] = await db.insert(twoFactorCodes).values({
    userId,
    codeHash,
    type,
    expiresAt,
    organizationId,
  }).returning();
  
  return code;
}

export async function getTwoFactorCode(userId: string, type: 'login' | 'setup'): Promise<TwoFactorCode | undefined> {
  const [code] = await db.select()
    .from(twoFactorCodes)
    .where(
      and(
        eq(twoFactorCodes.userId, userId),
        eq(twoFactorCodes.type, type)
      )
    );
  return code || undefined;
}

export async function incrementTwoFactorAttempts(codeId: string): Promise<number> {
  const [updated] = await db.update(twoFactorCodes)
    .set({ attempts: sql`${twoFactorCodes.attempts} + 1` })
    .where(eq(twoFactorCodes.id, codeId))
    .returning();
  return updated?.attempts || 0;
}

export async function markTwoFactorCodeUsed(codeId: string): Promise<void> {
  await db.update(twoFactorCodes)
    .set({ usedAt: new Date() })
    .where(eq(twoFactorCodes.id, codeId));
}

export async function deleteTwoFactorCodes(userId: string): Promise<void> {
  await db.delete(twoFactorCodes).where(eq(twoFactorCodes.userId, userId));
}

export async function cleanupExpiredTwoFactorCodes(): Promise<void> {
  await db.delete(twoFactorCodes)
    .where(sql`${twoFactorCodes.expiresAt} < (strftime('%s','now') * 1000) OR ${twoFactorCodes.usedAt} IS NOT NULL`);
}

// Super Admin Dashboard Functions
export interface OrganizationStats {
  totalOrganizations: number;
  totalUsers: number;
}

export async function getOrganizationStats(): Promise<OrganizationStats> {
  const allOrgs = await getAllOrganizations();
  const allUsers = await db.select().from(users);
  
  return {
    totalOrganizations: allOrgs.length,
    totalUsers: allUsers.length,
  };
}

export interface OrganizationWithDetails extends Organization {
  userCount: number;
  adminEmails: string[];
}

export async function getAllOrganizationsWithDetails(): Promise<OrganizationWithDetails[]> {
  const allOrgs = await getAllOrganizations();
  const allUsers = await db.select().from(users);
  
  return allOrgs.map(org => {
    const orgUsers = allUsers.filter(u => u.organizationId === org.id);
    const adminEmails = orgUsers.filter(u => u.role === 'administrator').map(u => u.email || '');
    
    return {
      ...org,
      userCount: orgUsers.length,
      adminEmails: adminEmails.filter(Boolean),
    };
  });
}
