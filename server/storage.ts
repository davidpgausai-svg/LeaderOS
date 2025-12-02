import { type User, type UpsertUser, type InsertUser, type Strategy, type InsertStrategy, type Project, type InsertProject, type Activity, type InsertActivity, type Action, type InsertAction, type Notification, type InsertNotification, type ActionDocument, type InsertActionDocument, type ActionChecklistItem, type InsertActionChecklistItem, type UserStrategyAssignment, type InsertUserStrategyAssignment, type MeetingNote, type InsertMeetingNote, type AiChatConversation, type InsertAiChatConversation, type Barrier, type InsertBarrier, type Dependency, type InsertDependency, type TemplateType, type InsertTemplateType } from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  getUsersByOrganization(organizationId: string): Promise<User[]>;
  deleteUser(id: string): Promise<boolean>;

  // Strategy methods
  getStrategy(id: string): Promise<Strategy | undefined>;
  getAllStrategies(): Promise<Strategy[]>;
  getStrategiesByOrganization(organizationId: string): Promise<Strategy[]>;
  getStrategiesByCreator(creatorId: string): Promise<Strategy[]>;
  createStrategy(strategy: InsertStrategy): Promise<Strategy>;
  updateStrategy(id: string, updates: Partial<Strategy>): Promise<Strategy | undefined>;
  deleteStrategy(id: string): Promise<boolean>;

  // Project methods
  getProject(id: string): Promise<Project | undefined>;
  getAllProjects(): Promise<Project[]>;
  getProjectsByOrganization(organizationId: string): Promise<Project[]>;
  getProjectsByStrategy(strategyId: string): Promise<Project[]>;
  getProjectsByAssignee(assigneeId: string): Promise<Project[]>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, updates: Partial<Project>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<boolean>;

  // Activity methods
  getActivity(id: string): Promise<Activity | undefined>;
  getAllActivities(): Promise<Activity[]>;
  getActivitiesByOrganization(organizationId: string): Promise<Activity[]>;
  getActivitiesByUser(userId: string): Promise<Activity[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;

  // Action methods
  getAction(id: string): Promise<Action | undefined>;
  getAllActions(): Promise<Action[]>;
  getActionsByOrganization(organizationId: string): Promise<Action[]>;
  getActionsByStrategy(strategyId: string): Promise<Action[]>;
  getActionsByProject(projectId: string): Promise<Action[]>;
  createAction(action: InsertAction): Promise<Action>;
  updateAction(id: string, updates: Partial<Action>): Promise<Action | undefined>;
  deleteAction(id: string): Promise<boolean>;

  // Progress recalculation methods
  recalculateProjectProgress(projectId: string): Promise<void>;
  recalculateStrategyProgress(strategyId: string): Promise<void>;

  // Notification methods
  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotificationsByUser(userId: string): Promise<Notification[]>;
  markNotificationAsRead(id: string): Promise<Notification | undefined>;
  markNotificationAsUnread(id: string): Promise<Notification | undefined>;
  markAllNotificationsAsRead(userId: string): Promise<void>;
  deleteNotification(id: string): Promise<boolean>;

  // Action Document methods
  getActionDocuments(actionId: string): Promise<ActionDocument[]>;
  createActionDocument(document: InsertActionDocument): Promise<ActionDocument>;
  updateActionDocument(id: string, updates: Partial<ActionDocument>): Promise<ActionDocument | undefined>;
  deleteActionDocument(id: string): Promise<boolean>;

  // Action Checklist Item methods
  getActionChecklistItems(actionId: string): Promise<ActionChecklistItem[]>;
  createActionChecklistItem(item: InsertActionChecklistItem): Promise<ActionChecklistItem>;
  updateActionChecklistItem(id: string, updates: Partial<ActionChecklistItem>): Promise<ActionChecklistItem | undefined>;
  deleteActionChecklistItem(id: string): Promise<boolean>;

  // User Strategy Assignment methods
  getUserStrategyAssignments(userId: string): Promise<UserStrategyAssignment[]>;
  getStrategyAssignments(strategyId: string): Promise<UserStrategyAssignment[]>;
  assignStrategy(userId: string, strategyId: string, assignedBy: string): Promise<UserStrategyAssignment>;
  unassignStrategy(userId: string, strategyId: string): Promise<boolean>;
  getUserAssignedStrategyIds(userId: string): Promise<string[]>;

  // Meeting Notes methods
  getAllMeetingNotes(): Promise<MeetingNote[]>;
  getMeetingNotesByOrganization(organizationId: string): Promise<MeetingNote[]>;
  getMeetingNote(id: string): Promise<MeetingNote | undefined>;
  createMeetingNote(note: InsertMeetingNote): Promise<MeetingNote>;
  updateMeetingNote(id: string, updates: Partial<MeetingNote>): Promise<MeetingNote | undefined>;
  deleteMeetingNote(id: string): Promise<boolean>;

  // AI Chat methods
  saveChatMessage(message: InsertAiChatConversation): Promise<AiChatConversation>;
  getRecentChatHistory(userId: string, limit: number): Promise<AiChatConversation[]>;
  clearChatHistory(userId: string): Promise<void>;

  // Barrier methods
  getBarrier(id: string): Promise<Barrier | undefined>;
  getAllBarriers(organizationId?: string): Promise<Barrier[]>;
  getBarriersByProject(projectId: string, organizationId?: string): Promise<Barrier[]>;
  createBarrier(barrier: InsertBarrier): Promise<Barrier>;
  updateBarrier(id: string, updates: Partial<Barrier>): Promise<Barrier | undefined>;
  deleteBarrier(id: string): Promise<boolean>;

  // Dependency methods
  getAllDependencies(): Promise<Dependency[]>;
  getDependenciesBySource(sourceType: string, sourceId: string): Promise<Dependency[]>;
  getDependenciesByTarget(targetType: string, targetId: string): Promise<Dependency[]>;
  createDependency(dependency: InsertDependency): Promise<Dependency>;
  deleteDependency(id: string): Promise<boolean>;

  // Template Type methods
  getAllTemplateTypes(): Promise<TemplateType[]>;
  createTemplateType(templateType: InsertTemplateType): Promise<TemplateType>;
  deleteTemplateType(id: string): Promise<boolean>;
}

// Use PostgreSQL storage
import { PostgresStorage } from './pgStorage';
export const storage: IStorage = new PostgresStorage();
