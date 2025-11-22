import { type InsertNotification } from "@shared/schema";
import { storage } from "./storage";

// Notification types
export const NotificationTypes = {
  ACTION_COMPLETED: "action_completed",
  ACTION_ACHIEVED: "action_achieved",
  PROJECT_PROGRESS_25: "project_progress_25",
  PROJECT_PROGRESS_50: "project_progress_50",
  PROJECT_PROGRESS_75: "project_progress_75",
  PROJECT_PROGRESS_100: "project_progress_100",
  STRATEGY_ALL_PROJECTS_COMPLETE: "strategy_all_projects_complete",
  ACTION_DUE_14_DAYS: "action_due_14_days",
  ACTION_DUE_7_DAYS: "action_due_7_days",
  ACTION_DUE_1_DAY: "action_due_1_day",
  ACTION_OVERDUE_1_DAY: "action_overdue_1_day",
  ACTION_OVERDUE_7_DAYS: "action_overdue_7_days",
  USER_ASSIGNED_TO_PROJECT: "user_assigned_to_project",
  STRATEGY_STATUS_CHANGED: "strategy_status_changed",
  PROJECT_STATUS_CHANGED: "project_status_changed",
  READINESS_RATING_CHANGED: "readiness_rating_changed",
  RISK_EXPOSURE_CHANGED: "risk_exposure_changed",
  CHANGE_CHAMPION_ASSIGNED: "change_champion_assigned",
} as const;

export type NotificationType = typeof NotificationTypes[keyof typeof NotificationTypes];

// Helper function to create a notification
export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  relatedEntityId?: string,
  relatedEntityType?: "strategy" | "tactic" | "outcome"
) {
  const notification: InsertNotification = {
    userId,
    type,
    title,
    message,
    relatedEntityId: relatedEntityId || null,
    relatedEntityType: relatedEntityType || null,
    isRead: "false",
  };

  return await storage.createNotification(notification);
}

// Helper function to notify multiple users
export async function notifyUsers(
  userIds: string[],
  type: NotificationType,
  title: string,
  message: string,
  relatedEntityId?: string,
  relatedEntityType?: "strategy" | "tactic" | "outcome"
) {
  const promises = userIds.map((userId) =>
    createNotification(userId, type, title, message, relatedEntityId, relatedEntityType)
  );
  return await Promise.all(promises);
}

// Specific notification functions

export async function notifyActionCompleted(
  actionId: string,
  actionTitle: string,
  tacticId: string,
  assignedUserIds: string[]
) {
  await notifyUsers(
    assignedUserIds,
    NotificationTypes.ACTION_COMPLETED,
    "Action Completed",
    `Action "${actionTitle}" has been marked as completed`,
    actionId,
    "outcome"
  );
}

export async function notifyActionAchieved(
  actionId: string,
  actionTitle: string,
  assignedUserIds: string[]
) {
  await notifyUsers(
    assignedUserIds,
    NotificationTypes.ACTION_ACHIEVED,
    "Action Achieved",
    `Action "${actionTitle}" has been marked as achieved`,
    actionId,
    "outcome"
  );
}

export async function notifyProjectProgress(
  tacticId: string,
  tacticTitle: string,
  progress: number,
  assignedUserIds: string[]
) {
  let type: NotificationType;
  let milestone: string;

  if (progress >= 100) {
    type = NotificationTypes.PROJECT_PROGRESS_100;
    milestone = "100%";
  } else if (progress >= 75) {
    type = NotificationTypes.PROJECT_PROGRESS_75;
    milestone = "75%";
  } else if (progress >= 50) {
    type = NotificationTypes.PROJECT_PROGRESS_50;
    milestone = "50%";
  } else if (progress >= 25) {
    type = NotificationTypes.PROJECT_PROGRESS_25;
    milestone = "25%";
  } else {
    return; // Don't notify for progress below 25%
  }

  await notifyUsers(
    assignedUserIds,
    type,
    `Project ${milestone} Complete`,
    `Project "${tacticTitle}" has reached ${milestone} completion`,
    tacticId,
    "tactic"
  );
}

export async function notifyStrategyAllProjectsComplete(
  strategyId: string,
  strategyTitle: string,
  executiveUserIds: string[]
) {
  await notifyUsers(
    executiveUserIds,
    NotificationTypes.STRATEGY_ALL_PROJECTS_COMPLETE,
    "Strategy Projects Complete",
    `All projects in strategy "${strategyTitle}" have been completed`,
    strategyId,
    "strategy"
  );
}

export async function notifyActionDueSoon(
  actionId: string,
  actionTitle: string,
  daysUntilDue: number,
  assignedUserIds: string[]
) {
  let type: NotificationType;
  let message: string;

  if (daysUntilDue === 14) {
    type = NotificationTypes.ACTION_DUE_14_DAYS;
    message = `Action "${actionTitle}" is due in 14 days`;
  } else if (daysUntilDue === 7) {
    type = NotificationTypes.ACTION_DUE_7_DAYS;
    message = `Action "${actionTitle}" is due in 7 days`;
  } else if (daysUntilDue === 1) {
    type = NotificationTypes.ACTION_DUE_1_DAY;
    message = `Action "${actionTitle}" is due tomorrow`;
  } else {
    return;
  }

  await notifyUsers(
    assignedUserIds,
    type,
    "Action Due Soon",
    message,
    actionId,
    "outcome"
  );
}

export async function notifyActionOverdue(
  actionId: string,
  actionTitle: string,
  daysPastDue: number,
  assignedUserIds: string[]
) {
  let type: NotificationType;
  let message: string;

  if (daysPastDue === 1) {
    type = NotificationTypes.ACTION_OVERDUE_1_DAY;
    message = `Action "${actionTitle}" is 1 day overdue`;
  } else if (daysPastDue === 7) {
    type = NotificationTypes.ACTION_OVERDUE_7_DAYS;
    message = `Action "${actionTitle}" is 7 days overdue`;
  } else {
    return;
  }

  await notifyUsers(
    assignedUserIds,
    type,
    "Action Overdue",
    message,
    actionId,
    "outcome"
  );
}

export async function notifyUserAssignedToProject(
  userId: string,
  tacticId: string,
  tacticTitle: string
) {
  await createNotification(
    userId,
    NotificationTypes.USER_ASSIGNED_TO_PROJECT,
    "Assigned to Project",
    `You have been assigned to project "${tacticTitle}"`,
    tacticId,
    "tactic"
  );
}

export async function notifyStrategyStatusChanged(
  strategyId: string,
  strategyTitle: string,
  oldStatus: string,
  newStatus: string,
  executiveUserIds: string[]
) {
  await notifyUsers(
    executiveUserIds,
    NotificationTypes.STRATEGY_STATUS_CHANGED,
    "Strategy Status Updated",
    `Strategy "${strategyTitle}" status changed from ${oldStatus} to ${newStatus}`,
    strategyId,
    "strategy"
  );
}

export async function notifyProjectStatusChanged(
  tacticId: string,
  tacticTitle: string,
  oldStatus: string,
  newStatus: string,
  assignedUserIds: string[]
) {
  await notifyUsers(
    assignedUserIds,
    NotificationTypes.PROJECT_STATUS_CHANGED,
    "Project Status Updated",
    `Project "${tacticTitle}" status changed from ${oldStatus} to ${newStatus}`,
    tacticId,
    "tactic"
  );
}

export async function notifyReadinessRatingChanged(
  strategyId: string,
  strategyTitle: string,
  oldRating: string,
  newRating: string,
  executiveUserIds: string[]
) {
  await notifyUsers(
    executiveUserIds,
    NotificationTypes.READINESS_RATING_CHANGED,
    "Readiness Rating Updated",
    `Strategy "${strategyTitle}" readiness rating changed from ${oldRating} to ${newRating}`,
    strategyId,
    "strategy"
  );
}

export async function notifyRiskExposureChanged(
  strategyId: string,
  strategyTitle: string,
  oldRisk: string,
  newRisk: string,
  executiveUserIds: string[]
) {
  await notifyUsers(
    executiveUserIds,
    NotificationTypes.RISK_EXPOSURE_CHANGED,
    "Risk Exposure Updated",
    `Strategy "${strategyTitle}" risk exposure changed from ${oldRisk} to ${newRisk}`,
    strategyId,
    "strategy"
  );
}

export async function notifyChangeChampionAssigned(
  userId: string,
  strategyId: string,
  strategyTitle: string
) {
  await createNotification(
    userId,
    NotificationTypes.CHANGE_CHAMPION_ASSIGNED,
    "Assigned as Change Champion",
    `You have been assigned as a change champion for strategy "${strategyTitle}"`,
    strategyId,
    "strategy"
  );
}
