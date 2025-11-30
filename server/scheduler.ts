import { storage } from "./storage";
import { notifyActionDueSoon, notifyActionOverdue } from "./notifications";
import { logger } from "./logger";
import { differenceInDays } from "date-fns";

// Track which actions have already been notified for which thresholds
// to prevent duplicate notifications
const notifiedActions = new Map<string, Set<number>>();

/**
 * Check all actions and send due date notifications for actions that are:
 * - 14, 7, or 1 day(s) before due
 * - 1 or 7 day(s) past due
 */
export async function checkDueDateNotifications() {
  try {
    const actions = await storage.getAllActions();
    const projects = await storage.getAllProjects();
    const now = new Date();

    for (const action of actions) {
      // Skip archived actions or actions without due dates
      if (action.isArchived === "true" || !action.dueDate) {
        continue;
      }

      // Skip completed or achieved actions
      if (action.status === "completed" || action.status === "achieved") {
        continue;
      }

      const dueDate = new Date(action.dueDate);
      const daysUntilDue = differenceInDays(dueDate, now);

      // Get the project to find assigned users
      const project = action.projectId ? await storage.getProject(action.projectId) : null;
      if (!project) continue;

      const assignedUserIds = JSON.parse(project.accountableLeaders);

      // Initialize notification tracking for this action
      if (!notifiedActions.has(action.id)) {
        notifiedActions.set(action.id, new Set());
      }
      const notified = notifiedActions.get(action.id)!;

      // Check for upcoming due dates (14, 7, 1 day before)
      if (daysUntilDue === 14 && !notified.has(14)) {
        await notifyActionDueSoon(action.id, action.title, 14, assignedUserIds);
        notified.add(14);
        logger.info(`Sent 14-day due notification for action: ${action.title}`);
      } else if (daysUntilDue === 7 && !notified.has(7)) {
        await notifyActionDueSoon(action.id, action.title, 7, assignedUserIds);
        notified.add(7);
        logger.info(`Sent 7-day due notification for action: ${action.title}`);
      } else if (daysUntilDue === 1 && !notified.has(1)) {
        await notifyActionDueSoon(action.id, action.title, 1, assignedUserIds);
        notified.add(1);
        logger.info(`Sent 1-day due notification for action: ${action.title}`);
      }

      // Check for overdue (1, 7 days past due)
      const daysPastDue = Math.abs(daysUntilDue);
      if (daysUntilDue < 0) {
        if (daysPastDue === 1 && !notified.has(-1)) {
          await notifyActionOverdue(action.id, action.title, 1, assignedUserIds);
          notified.add(-1);
          logger.info(`Sent 1-day overdue notification for action: ${action.title}`);
        } else if (daysPastDue === 7 && !notified.has(-7)) {
          await notifyActionOverdue(action.id, action.title, 7, assignedUserIds);
          notified.add(-7);
          logger.info(`Sent 7-day overdue notification for action: ${action.title}`);
        }
      }
    }

    logger.info("Due date notification check completed");
  } catch (error) {
    logger.error("Error checking due date notifications", error);
  }
}

/**
 * Start the due date notification scheduler
 * Runs every hour by default
 */
export function startDueDateScheduler(intervalMinutes: number = 60) {
  const intervalMs = intervalMinutes * 60 * 1000;
  
  // Run immediately on startup
  checkDueDateNotifications();
  
  // Then run on schedule
  setInterval(checkDueDateNotifications, intervalMs);
  
  logger.info(`Due date notification scheduler started (checking every ${intervalMinutes} minutes)`);
}
