import { db } from './db';
import { eq, desc, and, sql, inArray, or } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import type { IStorage } from './storage';
import {
  users, strategies, projects, activities, actions, notifications,
  actionDocuments, actionChecklistItems, userStrategyAssignments,
  meetingNotes, aiChatConversations, barriers, dependencies, templateTypes,
  organizations, passwordResetTokens, twoFactorCodes, executiveGoals, strategyExecutiveGoals,
  teamTags, projectTeamTags, projectResourceAssignments, actionPeopleAssignments,
  type User, type UpsertUser, type InsertUser,
  type Strategy, type InsertStrategy,
  type Project, type InsertProject,
  type Activity, type InsertActivity,
  type Action, type InsertAction,
  type Notification, type InsertNotification,
  type ActionDocument, type InsertActionDocument,
  type ActionChecklistItem, type InsertActionChecklistItem,
  type UserStrategyAssignment,
  type MeetingNote, type InsertMeetingNote,
  type AiChatConversation, type InsertAiChatConversation,
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
  type ProjectResourceAssignment, type InsertProjectResourceAssignment,
  type ActionPeopleAssignment, type InsertActionPeopleAssignment
} from '@shared/schema';

export class PostgresStorage implements IStorage {
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
    return db.select().from(projects);
  }

  async getProjectsByOrganization(organizationId: string): Promise<Project[]> {
    return db.select().from(projects).where(eq(projects.organizationId, organizationId));
  }

  async getProjectsByStrategy(strategyId: string): Promise<Project[]> {
    return db.select().from(projects).where(eq(projects.strategyId, strategyId));
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

  async createActionChecklistItem(insertItem: InsertActionChecklistItem): Promise<ActionChecklistItem> {
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

  async getAllMeetingNotes(): Promise<MeetingNote[]> {
    return db.select().from(meetingNotes).orderBy(desc(meetingNotes.meetingDate));
  }

  async getMeetingNotesByOrganization(organizationId: string): Promise<MeetingNote[]> {
    return db.select().from(meetingNotes)
      .where(eq(meetingNotes.organizationId, organizationId))
      .orderBy(desc(meetingNotes.meetingDate));
  }

  async getMeetingNote(id: string): Promise<MeetingNote | undefined> {
    const [note] = await db.select().from(meetingNotes).where(eq(meetingNotes.id, id));
    return note || undefined;
  }

  async createMeetingNote(insertNote: InsertMeetingNote): Promise<MeetingNote> {
    const [note] = await db.insert(meetingNotes).values({
      id: randomUUID(),
      ...insertNote,
    }).returning();
    return note;
  }

  async updateMeetingNote(id: string, updates: Partial<MeetingNote>): Promise<MeetingNote | undefined> {
    const [note] = await db.update(meetingNotes)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(meetingNotes.id, id))
      .returning();
    return note || undefined;
  }

  async deleteMeetingNote(id: string): Promise<boolean> {
    const result = await db.delete(meetingNotes).where(eq(meetingNotes.id, id)).returning();
    return result.length > 0;
  }

  async saveChatMessage(insertMessage: InsertAiChatConversation): Promise<AiChatConversation> {
    const [message] = await db.insert(aiChatConversations).values({
      id: randomUUID(),
      ...insertMessage,
    }).returning();
    return message;
  }

  async getRecentChatHistory(userId: string, limit: number): Promise<AiChatConversation[]> {
    const messages = await db.select().from(aiChatConversations)
      .where(eq(aiChatConversations.userId, userId))
      .orderBy(desc(aiChatConversations.createdAt))
      .limit(limit);
    return messages.reverse();
  }

  async clearChatHistory(userId: string): Promise<void> {
    await db.delete(aiChatConversations).where(eq(aiChatConversations.userId, userId));
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

export async function updateUserPassword(userId: string, passwordHash: string): Promise<void> {
  await db.update(users).set({ passwordHash }).where(eq(users.id, userId));
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
    .where(sql`${passwordResetTokens.expiresAt} < NOW() OR ${passwordResetTokens.usedAt} IS NOT NULL`);
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
    .where(sql`${twoFactorCodes.expiresAt} < NOW() OR ${twoFactorCodes.usedAt} IS NOT NULL`);
}
