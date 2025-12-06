import { sqlite } from './sqlite';
import { randomUUID } from 'crypto';
import type { IStorage } from './storage';
import type {
  User, UpsertUser, InsertUser,
  Strategy, InsertStrategy,
  Project, InsertProject,
  Activity, InsertActivity,
  Action, InsertAction,
  Notification, InsertNotification,
  ActionDocument, InsertActionDocument,
  ActionChecklistItem, InsertActionChecklistItem,
  UserStrategyAssignment, InsertUserStrategyAssignment,
  MeetingNote, InsertMeetingNote,
  AiChatConversation, InsertAiChatConversation,
  Barrier, InsertBarrier,
  Dependency, InsertDependency,
  TemplateType, InsertTemplateType
} from '@shared/schema';

function parseDate(dateStr: string | null): Date | null {
  if (!dateStr) return null;
  return new Date(dateStr);
}

function toISOString(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  if (typeof date === 'string') return date;
  return date.toISOString();
}

function mapUser(row: any): User {
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    profileImageUrl: row.profile_image_url,
    role: row.role,
    timezone: row.timezone,
    organizationId: row.organization_id,
    isSuperAdmin: row.is_super_admin,
    createdAt: parseDate(row.created_at),
    updatedAt: parseDate(row.updated_at),
  };
}

function mapStrategy(row: any): Strategy {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    goal: row.goal,
    startDate: parseDate(row.start_date)!,
    targetDate: parseDate(row.target_date)!,
    metrics: row.metrics,
    status: row.status,
    completionDate: parseDate(row.completion_date),
    colorCode: row.color_code,
    displayOrder: row.display_order,
    progress: row.progress,
    caseForChange: row.case_for_change,
    visionStatement: row.vision_statement,
    successMetrics: row.success_metrics,
    stakeholderMap: row.stakeholder_map,
    readinessRating: row.readiness_rating,
    riskExposureRating: row.risk_exposure_rating,
    changeChampionAssignment: row.change_champion_assignment,
    reinforcementPlan: row.reinforcement_plan,
    benefitsRealizationPlan: row.benefits_realization_plan,
    organizationId: row.organization_id,
    createdBy: row.created_by,
    createdAt: parseDate(row.created_at),
  };
}

function mapProject(row: any): Project {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    strategyId: row.strategy_id,
    kpi: row.kpi,
    kpiTracking: row.kpi_tracking,
    accountableLeaders: row.accountable_leaders,
    resourcesRequired: row.resources_required,
    startDate: parseDate(row.start_date)!,
    dueDate: parseDate(row.due_date)!,
    status: row.status,
    progress: row.progress,
    isArchived: row.is_archived,
    documentFolderUrl: row.document_folder_url,
    communicationUrl: row.communication_url,
    organizationId: row.organization_id,
    createdBy: row.created_by,
    createdAt: parseDate(row.created_at),
  };
}

function mapActivity(row: any): Activity {
  return {
    id: row.id,
    type: row.type,
    description: row.description,
    userId: row.user_id,
    strategyId: row.strategy_id,
    projectId: row.project_id,
    organizationId: row.organization_id,
    createdAt: parseDate(row.created_at),
  };
}

function mapAction(row: any): Action {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    strategyId: row.strategy_id,
    projectId: row.project_id,
    targetValue: row.target_value,
    currentValue: row.current_value,
    measurementUnit: row.measurement_unit,
    status: row.status,
    dueDate: parseDate(row.due_date),
    isArchived: row.is_archived,
    organizationId: row.organization_id,
    createdBy: row.created_by,
    createdAt: parseDate(row.created_at),
  };
}

function mapNotification(row: any): Notification {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    message: row.message,
    relatedEntityId: row.related_entity_id,
    relatedEntityType: row.related_entity_type,
    isRead: row.is_read,
    organizationId: row.organization_id,
    createdAt: parseDate(row.created_at),
  };
}

function mapActionDocument(row: any): ActionDocument {
  return {
    id: row.id,
    actionId: row.action_id,
    name: row.name,
    url: row.url,
    createdAt: parseDate(row.created_at),
  };
}

function mapActionChecklistItem(row: any): ActionChecklistItem {
  return {
    id: row.id,
    actionId: row.action_id,
    title: row.title,
    isCompleted: row.is_completed,
    orderIndex: row.order_index,
    createdAt: parseDate(row.created_at),
  };
}

function mapUserStrategyAssignment(row: any): UserStrategyAssignment {
  return {
    id: row.id,
    userId: row.user_id,
    strategyId: row.strategy_id,
    assignedBy: row.assigned_by,
    assignedAt: parseDate(row.assigned_at),
  };
}

function mapMeetingNote(row: any): MeetingNote {
  return {
    id: row.id,
    title: row.title,
    meetingDate: parseDate(row.meeting_date)!,
    strategyId: row.strategy_id,
    selectedProjectIds: row.selected_project_ids,
    selectedActionIds: row.selected_action_ids,
    notes: row.notes,
    organizationId: row.organization_id,
    createdBy: row.created_by,
    createdAt: parseDate(row.created_at),
    updatedAt: parseDate(row.updated_at),
  };
}

function mapBarrier(row: any): Barrier {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    description: row.description,
    severity: row.severity,
    status: row.status,
    ownerId: row.owner_id,
    identifiedDate: parseDate(row.identified_date),
    targetResolutionDate: parseDate(row.target_resolution_date),
    resolutionDate: parseDate(row.resolution_date),
    resolutionNotes: row.resolution_notes,
    organizationId: row.organization_id,
    createdBy: row.created_by,
    createdAt: parseDate(row.created_at),
    updatedAt: parseDate(row.updated_at),
  };
}

function mapDependency(row: any): Dependency {
  return {
    id: row.id,
    sourceType: row.source_type,
    sourceId: row.source_id,
    targetType: row.target_type,
    targetId: row.target_id,
    organizationId: row.organization_id,
    createdBy: row.created_by,
    createdAt: parseDate(row.created_at),
  };
}

function mapTemplateType(row: any): TemplateType {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    displayOrder: row.display_order,
    createdBy: row.created_by,
    createdAt: parseDate(row.created_at),
  };
}

function mapAiChatConversation(row: any): AiChatConversation {
  return {
    id: row.id,
    userId: row.user_id,
    message: row.message,
    role: row.role,
    context: row.context ? JSON.parse(row.context) : null,
    organizationId: row.organization_id,
    createdAt: parseDate(row.created_at),
  };
}

export class SQLiteStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const row = sqlite.prepare('SELECT * FROM users WHERE id = ?').get(id);
    return row ? mapUser(row) : undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const row = sqlite.prepare('SELECT * FROM users WHERE email = ?').get(email);
    return row ? mapUser(row) : undefined;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const now = new Date().toISOString();
    
    // First, check for existing user by id or email to preserve organization context
    let existingUser: { id: string, organization_id: string | null, is_super_admin: string, created_at: string } | undefined;
    
    // Try to find by id first
    if (userData.id) {
      existingUser = sqlite.prepare('SELECT id, organization_id, is_super_admin, created_at FROM users WHERE id = ?').get(userData.id) as typeof existingUser;
    }
    
    // If not found by id but email is provided, check by email
    if (!existingUser && userData.email) {
      existingUser = sqlite.prepare('SELECT id, organization_id, is_super_admin, created_at FROM users WHERE email = ?').get(userData.email) as typeof existingUser;
    }
    
    // Use existing id if found, otherwise generate new one
    const id = existingUser?.id || userData.id || randomUUID();
    
    // Delete duplicate email records (different id, same email) - but we've already captured the data above
    if (userData.email) {
      sqlite.prepare('DELETE FROM users WHERE email = ? AND id != ?').run(userData.email, id);
    }
    
    // Only update organization_id/is_super_admin if explicitly provided, otherwise preserve existing values
    const organizationId = userData.organizationId !== undefined ? userData.organizationId : (existingUser?.organization_id || null);
    const isSuperAdmin = userData.isSuperAdmin !== undefined ? userData.isSuperAdmin : (existingUser?.is_super_admin || 'false');
    const createdAt = existingUser?.created_at || now;

    const stmt = sqlite.prepare(`
      INSERT INTO users (id, email, first_name, last_name, profile_image_url, role, timezone, organization_id, is_super_admin, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        email = excluded.email,
        first_name = excluded.first_name,
        last_name = excluded.last_name,
        profile_image_url = excluded.profile_image_url,
        role = excluded.role,
        timezone = excluded.timezone,
        organization_id = excluded.organization_id,
        is_super_admin = excluded.is_super_admin,
        updated_at = excluded.updated_at
    `);

    stmt.run(
      id,
      userData.email || null,
      userData.firstName || null,
      userData.lastName || null,
      userData.profileImageUrl || null,
      userData.role || 'co_lead',
      userData.timezone || 'America/Chicago',
      organizationId,
      isSuperAdmin,
      createdAt,
      now
    );

    return (await this.getUser(id))!;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const now = new Date().toISOString();

    sqlite.prepare(`
      INSERT INTO users (id, email, first_name, last_name, profile_image_url, role, timezone, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      insertUser.email || null,
      insertUser.firstName || null,
      insertUser.lastName || null,
      insertUser.profileImageUrl || null,
      insertUser.role || 'co_lead',
      insertUser.timezone || 'America/Chicago',
      now,
      now
    );

    return (await this.getUser(id))!;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const existing = await this.getUser(id);
    if (!existing) return undefined;

    const fields: string[] = [];
    const values: any[] = [];

    if (updates.email !== undefined) { fields.push('email = ?'); values.push(updates.email); }
    if (updates.firstName !== undefined) { fields.push('first_name = ?'); values.push(updates.firstName); }
    if (updates.lastName !== undefined) { fields.push('last_name = ?'); values.push(updates.lastName); }
    if (updates.profileImageUrl !== undefined) { fields.push('profile_image_url = ?'); values.push(updates.profileImageUrl); }
    if (updates.role !== undefined) { fields.push('role = ?'); values.push(updates.role); }
    if (updates.timezone !== undefined) { fields.push('timezone = ?'); values.push(updates.timezone); }
    
    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    if (fields.length > 1) {
      sqlite.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    }

    return this.getUser(id);
  }

  async getAllUsers(): Promise<User[]> {
    const rows = sqlite.prepare('SELECT * FROM users').all();
    return rows.map(mapUser);
  }

  async getUsersByOrganization(organizationId: string): Promise<User[]> {
    const rows = sqlite.prepare('SELECT * FROM users WHERE organization_id = ?').all(organizationId);
    return rows.map(mapUser);
  }

  async deleteUser(id: string): Promise<boolean> {
    sqlite.prepare('DELETE FROM user_strategy_assignments WHERE user_id = ?').run(id);
    const result = sqlite.prepare('DELETE FROM users WHERE id = ?').run(id);
    return result.changes > 0;
  }

  async getStrategy(id: string): Promise<Strategy | undefined> {
    const row = sqlite.prepare('SELECT * FROM strategies WHERE id = ?').get(id);
    return row ? mapStrategy(row) : undefined;
  }

  async getAllStrategies(): Promise<Strategy[]> {
    const rows = sqlite.prepare('SELECT * FROM strategies ORDER BY display_order ASC').all();
    return rows.map(mapStrategy);
  }

  async getStrategiesByOrganization(organizationId: string): Promise<Strategy[]> {
    const rows = sqlite.prepare('SELECT * FROM strategies WHERE organization_id = ? ORDER BY display_order ASC').all(organizationId);
    return rows.map(mapStrategy);
  }

  async getStrategiesByCreator(creatorId: string): Promise<Strategy[]> {
    const rows = sqlite.prepare('SELECT * FROM strategies WHERE created_by = ?').all(creatorId);
    return rows.map(mapStrategy);
  }

  async createStrategy(insertStrategy: InsertStrategy): Promise<Strategy> {
    const id = randomUUID();
    const now = new Date().toISOString();

    sqlite.prepare(`
      INSERT INTO strategies (id, title, description, goal, start_date, target_date, metrics, status, completion_date,
        color_code, display_order, progress, case_for_change, vision_statement, success_metrics, stakeholder_map,
        readiness_rating, risk_exposure_rating, change_champion_assignment, reinforcement_plan, benefits_realization_plan,
        organization_id, created_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      insertStrategy.title,
      insertStrategy.description,
      insertStrategy.goal || null,
      toISOString(insertStrategy.startDate),
      toISOString(insertStrategy.targetDate),
      insertStrategy.metrics,
      insertStrategy.status || 'Active',
      toISOString(insertStrategy.completionDate),
      insertStrategy.colorCode || '#3B82F6',
      insertStrategy.displayOrder ?? 0,
      0,
      insertStrategy.caseForChange || 'To be defined',
      insertStrategy.visionStatement || 'To be defined',
      insertStrategy.successMetrics || 'To be defined',
      insertStrategy.stakeholderMap || 'To be defined',
      insertStrategy.readinessRating || 'To be defined',
      insertStrategy.riskExposureRating || 'To be defined',
      insertStrategy.changeChampionAssignment || 'To be defined',
      insertStrategy.reinforcementPlan || 'To be defined',
      insertStrategy.benefitsRealizationPlan || 'To be defined',
      insertStrategy.organizationId || null,
      insertStrategy.createdBy,
      now
    );

    await this.createActivity({
      type: 'strategy_created',
      description: `Created strategy "${insertStrategy.title}"`,
      userId: insertStrategy.createdBy,
      strategyId: id
    });

    return (await this.getStrategy(id))!;
  }

  async updateStrategy(id: string, updates: Partial<Strategy>): Promise<Strategy | undefined> {
    const existing = await this.getStrategy(id);
    if (!existing) return undefined;

    const fields: string[] = [];
    const values: any[] = [];

    if (updates.title !== undefined) { fields.push('title = ?'); values.push(updates.title); }
    if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description); }
    if (updates.goal !== undefined) { fields.push('goal = ?'); values.push(updates.goal); }
    if (updates.startDate !== undefined) { fields.push('start_date = ?'); values.push(toISOString(updates.startDate)); }
    if (updates.targetDate !== undefined) { fields.push('target_date = ?'); values.push(toISOString(updates.targetDate)); }
    if (updates.metrics !== undefined) { fields.push('metrics = ?'); values.push(updates.metrics); }
    if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status); }
    if (updates.completionDate !== undefined) { fields.push('completion_date = ?'); values.push(toISOString(updates.completionDate)); }
    if (updates.colorCode !== undefined) { fields.push('color_code = ?'); values.push(updates.colorCode); }
    if (updates.displayOrder !== undefined) { fields.push('display_order = ?'); values.push(updates.displayOrder); }
    if (updates.progress !== undefined) { fields.push('progress = ?'); values.push(updates.progress); }
    if (updates.caseForChange !== undefined) { fields.push('case_for_change = ?'); values.push(updates.caseForChange); }
    if (updates.visionStatement !== undefined) { fields.push('vision_statement = ?'); values.push(updates.visionStatement); }
    if (updates.successMetrics !== undefined) { fields.push('success_metrics = ?'); values.push(updates.successMetrics); }
    if (updates.stakeholderMap !== undefined) { fields.push('stakeholder_map = ?'); values.push(updates.stakeholderMap); }
    if (updates.readinessRating !== undefined) { fields.push('readiness_rating = ?'); values.push(updates.readinessRating); }
    if (updates.riskExposureRating !== undefined) { fields.push('risk_exposure_rating = ?'); values.push(updates.riskExposureRating); }
    if (updates.changeChampionAssignment !== undefined) { fields.push('change_champion_assignment = ?'); values.push(updates.changeChampionAssignment); }
    if (updates.reinforcementPlan !== undefined) { fields.push('reinforcement_plan = ?'); values.push(updates.reinforcementPlan); }
    if (updates.benefitsRealizationPlan !== undefined) { fields.push('benefits_realization_plan = ?'); values.push(updates.benefitsRealizationPlan); }

    if (fields.length > 0) {
      values.push(id);
      sqlite.prepare(`UPDATE strategies SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    }

    return this.getStrategy(id);
  }

  async deleteStrategy(id: string): Promise<boolean> {
    const relatedProjects = await this.getProjectsByStrategy(id);
    const relatedActions = await this.getActionsByStrategy(id);

    sqlite.prepare('DELETE FROM user_strategy_assignments WHERE strategy_id = ?').run(id);
    sqlite.prepare('DELETE FROM projects WHERE strategy_id = ?').run(id);
    sqlite.prepare('DELETE FROM actions WHERE strategy_id = ?').run(id);
    sqlite.prepare('DELETE FROM activities WHERE strategy_id = ?').run(id);

    const result = sqlite.prepare('DELETE FROM strategies WHERE id = ?').run(id);
    const deleted = result.changes > 0;

    if (deleted) {
      await this.createActivity({
        type: 'strategy_deleted',
        description: `Deleted strategy and ${relatedProjects.length} projects, ${relatedActions.length} actions`,
        userId: 'system',
        strategyId: null
      });
    }

    return deleted;
  }

  async getProject(id: string): Promise<Project | undefined> {
    const row = sqlite.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    return row ? mapProject(row) : undefined;
  }

  async getAllProjects(): Promise<Project[]> {
    const rows = sqlite.prepare('SELECT * FROM projects').all();
    return rows.map(mapProject);
  }

  async getProjectsByOrganization(organizationId: string): Promise<Project[]> {
    const rows = sqlite.prepare('SELECT * FROM projects WHERE organization_id = ?').all(organizationId);
    return rows.map(mapProject);
  }

  async getProjectsByStrategy(strategyId: string): Promise<Project[]> {
    const rows = sqlite.prepare('SELECT * FROM projects WHERE strategy_id = ?').all(strategyId);
    return rows.map(mapProject);
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
    const id = randomUUID();
    const now = new Date().toISOString();

    sqlite.prepare(`
      INSERT INTO projects (id, title, description, strategy_id, kpi, kpi_tracking, accountable_leaders,
        resources_required, start_date, due_date, status, progress, is_archived, document_folder_url,
        communication_url, organization_id, created_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      insertProject.title,
      insertProject.description,
      insertProject.strategyId,
      insertProject.kpi,
      insertProject.kpiTracking || null,
      insertProject.accountableLeaders,
      insertProject.resourcesRequired || null,
      toISOString(insertProject.startDate),
      toISOString(insertProject.dueDate),
      insertProject.status || 'NYS',
      0,
      insertProject.isArchived || 'false',
      insertProject.documentFolderUrl || null,
      insertProject.communicationUrl || null,
      insertProject.organizationId || null,
      insertProject.createdBy,
      now
    );

    await this.createActivity({
      type: 'project_created',
      description: `Created project "${insertProject.title}"`,
      userId: insertProject.createdBy,
      strategyId: insertProject.strategyId,
      projectId: id
    });

    return (await this.getProject(id))!;
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project | undefined> {
    const existing = await this.getProject(id);
    if (!existing) return undefined;

    const fields: string[] = [];
    const values: any[] = [];

    if (updates.title !== undefined) { fields.push('title = ?'); values.push(updates.title); }
    if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description); }
    if (updates.strategyId !== undefined) { fields.push('strategy_id = ?'); values.push(updates.strategyId); }
    if (updates.kpi !== undefined) { fields.push('kpi = ?'); values.push(updates.kpi); }
    if (updates.kpiTracking !== undefined) { fields.push('kpi_tracking = ?'); values.push(updates.kpiTracking); }
    if (updates.accountableLeaders !== undefined) { fields.push('accountable_leaders = ?'); values.push(updates.accountableLeaders); }
    if (updates.resourcesRequired !== undefined) { fields.push('resources_required = ?'); values.push(updates.resourcesRequired); }
    if (updates.startDate !== undefined) { fields.push('start_date = ?'); values.push(toISOString(updates.startDate)); }
    if (updates.dueDate !== undefined) { fields.push('due_date = ?'); values.push(toISOString(updates.dueDate)); }
    if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status); }
    if (updates.progress !== undefined) { fields.push('progress = ?'); values.push(updates.progress); }
    if (updates.isArchived !== undefined) { fields.push('is_archived = ?'); values.push(updates.isArchived); }
    if (updates.documentFolderUrl !== undefined) { fields.push('document_folder_url = ?'); values.push(updates.documentFolderUrl); }
    if (updates.communicationUrl !== undefined) { fields.push('communication_url = ?'); values.push(updates.communicationUrl); }

    if (fields.length > 0) {
      values.push(id);
      sqlite.prepare(`UPDATE projects SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    }

    return this.getProject(id);
  }

  async deleteProject(id: string): Promise<boolean> {
    const result = sqlite.prepare('DELETE FROM projects WHERE id = ?').run(id);
    return result.changes > 0;
  }

  async getActivity(id: string): Promise<Activity | undefined> {
    const row = sqlite.prepare('SELECT * FROM activities WHERE id = ?').get(id);
    return row ? mapActivity(row) : undefined;
  }

  async getAllActivities(): Promise<Activity[]> {
    const rows = sqlite.prepare('SELECT * FROM activities ORDER BY created_at DESC').all();
    return rows.map(mapActivity);
  }

  async getActivitiesByOrganization(organizationId: string): Promise<Activity[]> {
    const rows = sqlite.prepare('SELECT * FROM activities WHERE organization_id = ? ORDER BY created_at DESC').all(organizationId);
    return rows.map(mapActivity);
  }

  async getActivitiesByUser(userId: string): Promise<Activity[]> {
    const rows = sqlite.prepare('SELECT * FROM activities WHERE user_id = ? ORDER BY created_at DESC').all(userId);
    return rows.map(mapActivity);
  }

  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const id = randomUUID();
    const now = new Date().toISOString();

    sqlite.prepare(`
      INSERT INTO activities (id, type, description, user_id, strategy_id, project_id, organization_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      insertActivity.type,
      insertActivity.description,
      insertActivity.userId,
      insertActivity.strategyId || null,
      insertActivity.projectId || null,
      insertActivity.organizationId || null,
      now
    );

    return (await this.getActivity(id))!;
  }

  async getAction(id: string): Promise<Action | undefined> {
    const row = sqlite.prepare('SELECT * FROM actions WHERE id = ?').get(id);
    return row ? mapAction(row) : undefined;
  }

  async getAllActions(): Promise<Action[]> {
    const rows = sqlite.prepare('SELECT * FROM actions').all();
    return rows.map(mapAction);
  }

  async getActionsByOrganization(organizationId: string): Promise<Action[]> {
    const rows = sqlite.prepare('SELECT * FROM actions WHERE organization_id = ?').all(organizationId);
    return rows.map(mapAction);
  }

  async getActionsByStrategy(strategyId: string): Promise<Action[]> {
    const rows = sqlite.prepare('SELECT * FROM actions WHERE strategy_id = ?').all(strategyId);
    return rows.map(mapAction);
  }

  async getActionsByProject(projectId: string): Promise<Action[]> {
    const rows = sqlite.prepare('SELECT * FROM actions WHERE project_id = ?').all(projectId);
    return rows.map(mapAction);
  }

  async createAction(insertAction: InsertAction): Promise<Action> {
    const id = randomUUID();
    const now = new Date().toISOString();

    sqlite.prepare(`
      INSERT INTO actions (id, title, description, strategy_id, project_id, target_value, current_value,
        measurement_unit, status, due_date, is_archived, organization_id, created_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      insertAction.title,
      insertAction.description,
      insertAction.strategyId,
      insertAction.projectId || null,
      insertAction.targetValue || null,
      insertAction.currentValue || null,
      insertAction.measurementUnit || null,
      insertAction.status || 'in_progress',
      toISOString(insertAction.dueDate),
      insertAction.isArchived || 'false',
      insertAction.organizationId || null,
      insertAction.createdBy,
      now
    );

    return (await this.getAction(id))!;
  }

  async updateAction(id: string, updates: Partial<Action>): Promise<Action | undefined> {
    const existing = await this.getAction(id);
    if (!existing) return undefined;

    const fields: string[] = [];
    const values: any[] = [];

    if (updates.title !== undefined) { fields.push('title = ?'); values.push(updates.title); }
    if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description); }
    if (updates.strategyId !== undefined) { fields.push('strategy_id = ?'); values.push(updates.strategyId); }
    if (updates.projectId !== undefined) { fields.push('project_id = ?'); values.push(updates.projectId); }
    if (updates.targetValue !== undefined) { fields.push('target_value = ?'); values.push(updates.targetValue); }
    if (updates.currentValue !== undefined) { fields.push('current_value = ?'); values.push(updates.currentValue); }
    if (updates.measurementUnit !== undefined) { fields.push('measurement_unit = ?'); values.push(updates.measurementUnit); }
    if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status); }
    if (updates.dueDate !== undefined) { fields.push('due_date = ?'); values.push(toISOString(updates.dueDate)); }
    if (updates.isArchived !== undefined) { fields.push('is_archived = ?'); values.push(updates.isArchived); }

    if (fields.length > 0) {
      values.push(id);
      sqlite.prepare(`UPDATE actions SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    }

    return this.getAction(id);
  }

  async deleteAction(id: string): Promise<boolean> {
    const result = sqlite.prepare('DELETE FROM actions WHERE id = ?').run(id);
    return result.changes > 0;
  }

  async recalculateProjectProgress(projectId: string): Promise<void> {
    const projectActions = await this.getActionsByProject(projectId);
    const nonArchivedActions = projectActions.filter(action => action.isArchived !== 'true');

    let progress = 0;
    if (nonArchivedActions.length > 0) {
      const completedCount = nonArchivedActions.filter(action => action.status === 'achieved').length;
      progress = Math.floor((completedCount / nonArchivedActions.length) * 100);
    }

    sqlite.prepare('UPDATE projects SET progress = ? WHERE id = ?').run(progress, projectId);
  }

  async recalculateStrategyProgress(strategyId: string): Promise<void> {
    const strategyProjects = await this.getProjectsByStrategy(strategyId);
    const nonArchivedProjects = strategyProjects.filter(project => project.isArchived !== 'true');

    let progress = 0;
    if (nonArchivedProjects.length > 0) {
      const totalProgress = nonArchivedProjects.reduce((sum, project) => sum + project.progress, 0);
      progress = Math.floor(totalProgress / nonArchivedProjects.length);
    }

    sqlite.prepare('UPDATE strategies SET progress = ? WHERE id = ?').run(progress, strategyId);
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const id = randomUUID();
    const now = new Date().toISOString();

    sqlite.prepare(`
      INSERT INTO notifications (id, user_id, type, title, message, related_entity_id, related_entity_type, is_read, organization_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      notification.userId,
      notification.type,
      notification.title,
      notification.message,
      notification.relatedEntityId || null,
      notification.relatedEntityType || null,
      notification.isRead || 'false',
      notification.organizationId || null,
      now
    );

    const row = sqlite.prepare('SELECT * FROM notifications WHERE id = ?').get(id);
    return mapNotification(row);
  }

  async getNotificationsByUser(userId: string): Promise<Notification[]> {
    const rows = sqlite.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC').all(userId);
    return rows.map(mapNotification);
  }

  async markNotificationAsRead(id: string): Promise<Notification | undefined> {
    sqlite.prepare('UPDATE notifications SET is_read = ? WHERE id = ?').run('true', id);
    const row = sqlite.prepare('SELECT * FROM notifications WHERE id = ?').get(id);
    return row ? mapNotification(row) : undefined;
  }

  async markNotificationAsUnread(id: string): Promise<Notification | undefined> {
    sqlite.prepare('UPDATE notifications SET is_read = ? WHERE id = ?').run('false', id);
    const row = sqlite.prepare('SELECT * FROM notifications WHERE id = ?').get(id);
    return row ? mapNotification(row) : undefined;
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    sqlite.prepare('UPDATE notifications SET is_read = ? WHERE user_id = ?').run('true', userId);
  }

  async deleteNotification(id: string): Promise<boolean> {
    const result = sqlite.prepare('DELETE FROM notifications WHERE id = ?').run(id);
    return result.changes > 0;
  }

  async getActionDocuments(actionId: string): Promise<ActionDocument[]> {
    const rows = sqlite.prepare('SELECT * FROM action_documents WHERE action_id = ? ORDER BY created_at ASC').all(actionId);
    return rows.map(mapActionDocument);
  }

  async createActionDocument(document: InsertActionDocument): Promise<ActionDocument> {
    const id = randomUUID();
    const now = new Date().toISOString();

    sqlite.prepare(`
      INSERT INTO action_documents (id, action_id, name, url, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, document.actionId, document.name, document.url, now);

    const row = sqlite.prepare('SELECT * FROM action_documents WHERE id = ?').get(id);
    return mapActionDocument(row);
  }

  async updateActionDocument(id: string, updates: Partial<ActionDocument>): Promise<ActionDocument | undefined> {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
    if (updates.url !== undefined) { fields.push('url = ?'); values.push(updates.url); }

    if (fields.length > 0) {
      values.push(id);
      sqlite.prepare(`UPDATE action_documents SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    }

    const row = sqlite.prepare('SELECT * FROM action_documents WHERE id = ?').get(id);
    return row ? mapActionDocument(row) : undefined;
  }

  async deleteActionDocument(id: string): Promise<boolean> {
    const result = sqlite.prepare('DELETE FROM action_documents WHERE id = ?').run(id);
    return result.changes > 0;
  }

  async getAllActionChecklistItems(): Promise<ActionChecklistItem[]> {
    const rows = sqlite.prepare('SELECT * FROM action_checklist_items ORDER BY order_index ASC').all();
    return rows.map(mapActionChecklistItem);
  }

  async getActionChecklistItems(actionId: string): Promise<ActionChecklistItem[]> {
    const rows = sqlite.prepare('SELECT * FROM action_checklist_items WHERE action_id = ? ORDER BY order_index ASC').all(actionId);
    return rows.map(mapActionChecklistItem);
  }

  async createActionChecklistItem(item: InsertActionChecklistItem): Promise<ActionChecklistItem> {
    const id = randomUUID();
    const now = new Date().toISOString();

    sqlite.prepare(`
      INSERT INTO action_checklist_items (id, action_id, title, is_completed, order_index, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, item.actionId, item.title, item.isCompleted || 'false', item.orderIndex ?? 0, now);

    const row = sqlite.prepare('SELECT * FROM action_checklist_items WHERE id = ?').get(id);
    return mapActionChecklistItem(row);
  }

  async updateActionChecklistItem(id: string, updates: Partial<ActionChecklistItem>): Promise<ActionChecklistItem | undefined> {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.title !== undefined) { fields.push('title = ?'); values.push(updates.title); }
    if (updates.isCompleted !== undefined) { fields.push('is_completed = ?'); values.push(updates.isCompleted); }
    if (updates.orderIndex !== undefined) { fields.push('order_index = ?'); values.push(updates.orderIndex); }

    if (fields.length > 0) {
      values.push(id);
      sqlite.prepare(`UPDATE action_checklist_items SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    }

    const row = sqlite.prepare('SELECT * FROM action_checklist_items WHERE id = ?').get(id);
    return row ? mapActionChecklistItem(row) : undefined;
  }

  async deleteActionChecklistItem(id: string): Promise<boolean> {
    const result = sqlite.prepare('DELETE FROM action_checklist_items WHERE id = ?').run(id);
    return result.changes > 0;
  }

  async getUserStrategyAssignments(userId: string): Promise<UserStrategyAssignment[]> {
    const rows = sqlite.prepare(`
      SELECT usa.* FROM user_strategy_assignments usa
      INNER JOIN strategies s ON usa.strategy_id = s.id
      WHERE usa.user_id = ? AND s.status != 'archived'
    `).all(userId);
    return rows.map(mapUserStrategyAssignment);
  }

  async getStrategyAssignments(strategyId: string): Promise<UserStrategyAssignment[]> {
    const rows = sqlite.prepare('SELECT * FROM user_strategy_assignments WHERE strategy_id = ?').all(strategyId);
    return rows.map(mapUserStrategyAssignment);
  }

  async assignStrategy(userId: string, strategyId: string, assignedBy: string): Promise<UserStrategyAssignment> {
    const id = randomUUID();
    const now = new Date().toISOString();

    sqlite.prepare(`
      INSERT INTO user_strategy_assignments (id, user_id, strategy_id, assigned_by, assigned_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, userId, strategyId, assignedBy, now);

    const row = sqlite.prepare('SELECT * FROM user_strategy_assignments WHERE id = ?').get(id);
    return mapUserStrategyAssignment(row);
  }

  async unassignStrategy(userId: string, strategyId: string): Promise<boolean> {
    const result = sqlite.prepare('DELETE FROM user_strategy_assignments WHERE user_id = ? AND strategy_id = ?').run(userId, strategyId);
    return result.changes > 0;
  }

  async getUserAssignedStrategyIds(userId: string): Promise<string[]> {
    const assignments = await this.getUserStrategyAssignments(userId);
    return assignments.map(a => a.strategyId);
  }

  async getAllMeetingNotes(): Promise<MeetingNote[]> {
    const rows = sqlite.prepare('SELECT * FROM meeting_notes ORDER BY meeting_date DESC').all();
    return rows.map(mapMeetingNote);
  }

  async getMeetingNotesByOrganization(organizationId: string): Promise<MeetingNote[]> {
    const rows = sqlite.prepare('SELECT * FROM meeting_notes WHERE organization_id = ? ORDER BY meeting_date DESC').all(organizationId);
    return rows.map(mapMeetingNote);
  }

  async getMeetingNote(id: string): Promise<MeetingNote | undefined> {
    const row = sqlite.prepare('SELECT * FROM meeting_notes WHERE id = ?').get(id);
    return row ? mapMeetingNote(row) : undefined;
  }

  async createMeetingNote(note: InsertMeetingNote): Promise<MeetingNote> {
    const id = randomUUID();
    const now = new Date().toISOString();

    sqlite.prepare(`
      INSERT INTO meeting_notes (id, title, meeting_date, strategy_id, selected_project_ids, selected_action_ids, notes, organization_id, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      note.title,
      toISOString(note.meetingDate),
      note.strategyId,
      note.selectedProjectIds,
      note.selectedActionIds,
      note.notes,
      note.organizationId || null,
      note.createdBy,
      now,
      now
    );

    return (await this.getMeetingNote(id))!;
  }

  async updateMeetingNote(id: string, updates: Partial<MeetingNote>): Promise<MeetingNote | undefined> {
    const existing = await this.getMeetingNote(id);
    if (!existing) return undefined;

    const fields: string[] = [];
    const values: any[] = [];

    if (updates.title !== undefined) { fields.push('title = ?'); values.push(updates.title); }
    if (updates.meetingDate !== undefined) { fields.push('meeting_date = ?'); values.push(toISOString(updates.meetingDate)); }
    if (updates.strategyId !== undefined) { fields.push('strategy_id = ?'); values.push(updates.strategyId); }
    if (updates.selectedProjectIds !== undefined) { fields.push('selected_project_ids = ?'); values.push(updates.selectedProjectIds); }
    if (updates.selectedActionIds !== undefined) { fields.push('selected_action_ids = ?'); values.push(updates.selectedActionIds); }
    if (updates.notes !== undefined) { fields.push('notes = ?'); values.push(updates.notes); }

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    if (fields.length > 1) {
      sqlite.prepare(`UPDATE meeting_notes SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    }

    return this.getMeetingNote(id);
  }

  async deleteMeetingNote(id: string): Promise<boolean> {
    const result = sqlite.prepare('DELETE FROM meeting_notes WHERE id = ?').run(id);
    return result.changes > 0;
  }

  async saveChatMessage(message: InsertAiChatConversation): Promise<AiChatConversation> {
    const id = randomUUID();
    const now = new Date().toISOString();

    sqlite.prepare(`
      INSERT INTO ai_chat_conversations (id, user_id, message, role, context, organization_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      message.userId,
      message.message,
      message.role,
      message.context ? JSON.stringify(message.context) : null,
      message.organizationId || null,
      now
    );

    const row = sqlite.prepare('SELECT * FROM ai_chat_conversations WHERE id = ?').get(id);
    return mapAiChatConversation(row);
  }

  async getRecentChatHistory(userId: string, limit: number): Promise<AiChatConversation[]> {
    const rows = sqlite.prepare('SELECT * FROM ai_chat_conversations WHERE user_id = ? ORDER BY created_at DESC LIMIT ?').all(userId, limit);
    return rows.map(mapAiChatConversation).reverse();
  }

  async clearChatHistory(userId: string): Promise<void> {
    sqlite.prepare('DELETE FROM ai_chat_conversations WHERE user_id = ?').run(userId);
  }

  async getBarrier(id: string): Promise<Barrier | undefined> {
    const row = sqlite.prepare('SELECT * FROM barriers WHERE id = ?').get(id);
    return row ? mapBarrier(row) : undefined;
  }

  async getAllBarriers(): Promise<Barrier[]> {
    const rows = sqlite.prepare('SELECT * FROM barriers').all();
    return rows.map(mapBarrier);
  }

  async getBarriersByProject(projectId: string): Promise<Barrier[]> {
    const rows = sqlite.prepare('SELECT * FROM barriers WHERE project_id = ?').all(projectId);
    return rows.map(mapBarrier);
  }

  async createBarrier(barrier: InsertBarrier): Promise<Barrier> {
    const id = randomUUID();
    const now = new Date().toISOString();

    sqlite.prepare(`
      INSERT INTO barriers (id, project_id, title, description, severity, status, owner_id, identified_date,
        target_resolution_date, resolution_date, resolution_notes, organization_id, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      barrier.projectId,
      barrier.title,
      barrier.description,
      barrier.severity || 'medium',
      barrier.status || 'active',
      barrier.ownerId || null,
      now,
      toISOString(barrier.targetResolutionDate),
      null,
      barrier.resolutionNotes || null,
      barrier.organizationId || null,
      barrier.createdBy,
      now,
      now
    );

    return (await this.getBarrier(id))!;
  }

  async updateBarrier(id: string, updates: Partial<Barrier>): Promise<Barrier | undefined> {
    const existing = await this.getBarrier(id);
    if (!existing) return undefined;

    const fields: string[] = [];
    const values: any[] = [];

    if (updates.title !== undefined) { fields.push('title = ?'); values.push(updates.title); }
    if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description); }
    if (updates.severity !== undefined) { fields.push('severity = ?'); values.push(updates.severity); }
    if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status); }
    if (updates.ownerId !== undefined) { fields.push('owner_id = ?'); values.push(updates.ownerId); }
    if (updates.targetResolutionDate !== undefined) { fields.push('target_resolution_date = ?'); values.push(toISOString(updates.targetResolutionDate)); }
    if (updates.resolutionDate !== undefined) { fields.push('resolution_date = ?'); values.push(toISOString(updates.resolutionDate)); }
    if (updates.resolutionNotes !== undefined) { fields.push('resolution_notes = ?'); values.push(updates.resolutionNotes); }

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    if (fields.length > 1) {
      sqlite.prepare(`UPDATE barriers SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    }

    return this.getBarrier(id);
  }

  async deleteBarrier(id: string): Promise<boolean> {
    const result = sqlite.prepare('DELETE FROM barriers WHERE id = ?').run(id);
    return result.changes > 0;
  }

  async getAllDependencies(): Promise<Dependency[]> {
    const rows = sqlite.prepare('SELECT * FROM dependencies').all();
    return rows.map(mapDependency);
  }

  async getDependenciesBySource(sourceType: string, sourceId: string): Promise<Dependency[]> {
    const rows = sqlite.prepare('SELECT * FROM dependencies WHERE source_type = ? AND source_id = ?').all(sourceType, sourceId);
    return rows.map(mapDependency);
  }

  async getDependenciesByTarget(targetType: string, targetId: string): Promise<Dependency[]> {
    const rows = sqlite.prepare('SELECT * FROM dependencies WHERE target_type = ? AND target_id = ?').all(targetType, targetId);
    return rows.map(mapDependency);
  }

  async createDependency(dependency: InsertDependency): Promise<Dependency> {
    const id = randomUUID();
    const now = new Date().toISOString();

    sqlite.prepare(`
      INSERT INTO dependencies (id, source_type, source_id, target_type, target_id, organization_id, created_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      dependency.sourceType,
      dependency.sourceId,
      dependency.targetType,
      dependency.targetId,
      dependency.organizationId || null,
      'system',
      now
    );

    const row = sqlite.prepare('SELECT * FROM dependencies WHERE id = ?').get(id);
    return mapDependency(row);
  }

  async deleteDependency(id: string): Promise<boolean> {
    const result = sqlite.prepare('DELETE FROM dependencies WHERE id = ?').run(id);
    return result.changes > 0;
  }

  async getAllTemplateTypes(): Promise<TemplateType[]> {
    const rows = sqlite.prepare('SELECT * FROM template_types ORDER BY display_order ASC').all();
    return rows.map(mapTemplateType);
  }

  async createTemplateType(templateType: InsertTemplateType): Promise<TemplateType> {
    const id = randomUUID();
    const now = new Date().toISOString();

    sqlite.prepare(`
      INSERT INTO template_types (id, name, description, display_order, created_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      id,
      templateType.name,
      templateType.description || null,
      templateType.displayOrder ?? 0,
      templateType.createdBy,
      now
    );

    const row = sqlite.prepare('SELECT * FROM template_types WHERE id = ?').get(id);
    return mapTemplateType(row);
  }

  async deleteTemplateType(id: string): Promise<boolean> {
    const result = sqlite.prepare('DELETE FROM template_types WHERE id = ?').run(id);
    return result.changes > 0;
  }
}
