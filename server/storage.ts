import { type User, type UpsertUser, type InsertUser, type Strategy, type InsertStrategy, type Project, type InsertProject, type Activity, type InsertActivity, type Action, type InsertAction, type Notification, type InsertNotification, type ActionDocument, type InsertActionDocument, type ActionChecklistItem, type InsertActionChecklistItem, type UserStrategyAssignment, type InsertUserStrategyAssignment, type MeetingNote, type InsertMeetingNote, type Barrier, type InsertBarrier, type Dependency, type InsertDependency, type TemplateType, type InsertTemplateType, type ExecutiveGoal, type InsertExecutiveGoal, type StrategyExecutiveGoal, type TeamTag, type InsertTeamTag, type ProjectTeamTag, type ProjectResourceAssignment, type InsertProjectResourceAssignment, type ActionPeopleAssignment, type InsertActionPeopleAssignment, type PtoEntry, type InsertPtoEntry, type Holiday, type InsertHoliday, type ProjectSnapshot, type InsertProjectSnapshot } from "@shared/schema";

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
  deleteDueDateNotificationsForAction(actionId: string): Promise<number>;

  // Action Document methods
  getActionDocuments(actionId: string): Promise<ActionDocument[]>;
  createActionDocument(document: InsertActionDocument): Promise<ActionDocument>;
  updateActionDocument(id: string, updates: Partial<ActionDocument>): Promise<ActionDocument | undefined>;
  deleteActionDocument(id: string): Promise<boolean>;

  // Action Checklist Item methods
  getAllActionChecklistItems(): Promise<ActionChecklistItem[]>;
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

  // Barrier methods
  getBarrier(id: string): Promise<Barrier | undefined>;
  getAllBarriers(organizationId?: string): Promise<Barrier[]>;
  getBarriersByProject(projectId: string, organizationId?: string): Promise<Barrier[]>;
  createBarrier(barrier: InsertBarrier & { createdBy: string; organizationId?: string | null }): Promise<Barrier>;
  updateBarrier(id: string, updates: Partial<Barrier>): Promise<Barrier | undefined>;
  deleteBarrier(id: string): Promise<boolean>;

  // Dependency methods
  getAllDependencies(organizationId?: string): Promise<Dependency[]>;
  getDependenciesBySource(sourceType: string, sourceId: string, organizationId?: string): Promise<Dependency[]>;
  getDependenciesByTarget(targetType: string, targetId: string, organizationId?: string): Promise<Dependency[]>;
  createDependency(dependency: InsertDependency & { createdBy: string; organizationId?: string | null }): Promise<Dependency>;
  deleteDependency(id: string): Promise<boolean>;
  deleteDependenciesForEntities(projectIds: string[], actionIds: string[], organizationId?: string): Promise<number>;

  // Template Type methods
  getAllTemplateTypes(): Promise<TemplateType[]>;
  createTemplateType(templateType: InsertTemplateType): Promise<TemplateType>;
  deleteTemplateType(id: string): Promise<boolean>;

  // Executive Goal methods
  getExecutiveGoalsByOrganization(organizationId: string): Promise<ExecutiveGoal[]>;
  getExecutiveGoal(id: string): Promise<ExecutiveGoal | undefined>;
  createExecutiveGoal(goal: InsertExecutiveGoal & { organizationId: string; createdBy: string }): Promise<ExecutiveGoal>;
  updateExecutiveGoal(id: string, updates: Partial<InsertExecutiveGoal>): Promise<ExecutiveGoal | undefined>;
  deleteExecutiveGoal(id: string): Promise<boolean>;
  
  // Strategy Executive Goal (many-to-many) methods
  getStrategyExecutiveGoals(strategyId: string): Promise<StrategyExecutiveGoal[]>;
  setStrategyExecutiveGoals(strategyId: string, goalIds: string[], organizationId: string): Promise<StrategyExecutiveGoal[]>;

  // Team Tag methods
  getTeamTagsByOrganization(organizationId: string): Promise<TeamTag[]>;
  getTeamTag(id: string): Promise<TeamTag | undefined>;
  createTeamTag(tag: InsertTeamTag & { organizationId: string; createdBy: string }): Promise<TeamTag>;
  updateTeamTag(id: string, updates: Partial<InsertTeamTag>): Promise<TeamTag | undefined>;
  deleteTeamTag(id: string): Promise<boolean>;

  // Project Team Tag (many-to-many) methods
  getProjectTeamTags(projectId: string): Promise<ProjectTeamTag[]>;
  setProjectTeamTags(projectId: string, tagIds: string[], organizationId: string): Promise<ProjectTeamTag[]>;
  getProjectsByTeamTag(teamTagId: string, organizationId: string): Promise<Project[]>;

  // Project Resource Assignment methods (for capacity planning)
  getProjectResourceAssignments(projectId: string): Promise<ProjectResourceAssignment[]>;
  getResourceAssignmentsByUser(userId: string, organizationId: string): Promise<ProjectResourceAssignment[]>;
  getResourceAssignmentsByOrganization(organizationId: string): Promise<ProjectResourceAssignment[]>;
  upsertProjectResourceAssignment(assignment: InsertProjectResourceAssignment): Promise<ProjectResourceAssignment>;
  deleteProjectResourceAssignment(projectId: string, userId: string): Promise<boolean>;

  // Action People Assignment methods (for to-do list tagging, no hours)
  getActionPeopleAssignments(actionId: string): Promise<ActionPeopleAssignment[]>;
  getActionPeopleAssignmentsByOrganization(organizationId: string): Promise<ActionPeopleAssignment[]>;
  getActionPeopleAssignmentsByUser(userId: string, organizationId: string): Promise<ActionPeopleAssignment[]>;
  createActionPeopleAssignment(assignment: InsertActionPeopleAssignment): Promise<ActionPeopleAssignment>;
  deleteActionPeopleAssignment(actionId: string, userId: string): Promise<boolean>;

  // PTO Entry methods
  getPtoEntriesByUser(userId: string): Promise<PtoEntry[]>;
  getPtoEntriesByOrganization(organizationId: string): Promise<PtoEntry[]>;
  getPtoEntry(id: string): Promise<PtoEntry | undefined>;
  createPtoEntry(entry: InsertPtoEntry & { userId: string; organizationId: string }): Promise<PtoEntry>;
  updatePtoEntry(id: string, updates: Partial<InsertPtoEntry>): Promise<PtoEntry | undefined>;
  deletePtoEntry(id: string): Promise<boolean>;

  // Holiday methods
  getHolidaysByOrganization(organizationId: string): Promise<Holiday[]>;
  getHoliday(id: string): Promise<Holiday | undefined>;
  createHoliday(holiday: InsertHoliday & { organizationId: string }): Promise<Holiday>;
  updateHoliday(id: string, updates: Partial<InsertHoliday>): Promise<Holiday | undefined>;
  deleteHoliday(id: string): Promise<boolean>;

  // Project Snapshot methods (for archive/unarchive version history)
  getProjectSnapshots(projectId: string): Promise<ProjectSnapshot[]>;
  createProjectSnapshot(snapshot: InsertProjectSnapshot): Promise<ProjectSnapshot>;

  // Project Archive methods
  getArchivedProjectsByOrganization(organizationId: string): Promise<Project[]>;
  archiveProject(projectId: string, archivedBy: string, reason?: string, wakeUpDate?: Date): Promise<Project | undefined>;
  unarchiveProject(projectId: string, restoredBy: string): Promise<Project | undefined>;
  copyProject(projectId: string, newTitle: string, createdBy: string, asTemplate?: boolean): Promise<Project | undefined>;
}

// Use PostgreSQL storage
import { PostgresStorage } from './pgStorage';
export const storage: IStorage = new PostgresStorage();
