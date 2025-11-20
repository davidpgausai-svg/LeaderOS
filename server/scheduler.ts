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
    const outcomes = await storage.getAllOutcomes();
    const tactics = await storage.getAllTactics();
    const now = new Date();

    for (const outcome of outcomes) {
      // Skip archived actions or actions without due dates
      if (outcome.isArchived === "true" || !outcome.dueDate) {
        continue;
      }

      // Skip completed or achieved actions
      if (outcome.status === "in_progress" || outcome.status === "achieved") {
        continue;
      }

      const dueDate = new Date(outcome.dueDate);
      const daysUntilDue = differenceInDays(dueDate, now);

      // Get the tactic to find assigned users
      const tactic = outcome.tacticId ? await storage.getTactic(outcome.tacticId) : null;
      if (!tactic) continue;

      const assignedUserIds = JSON.parse(tactic.accountableLeaders);

      // Initialize notification tracking for this action
      if (!notifiedActions.has(outcome.id)) {
        notifiedActions.set(outcome.id, new Set());
      }
      const notified = notifiedActions.get(outcome.id)!;

      // Check for upcoming due dates (14, 7, 1 day before)
      if (daysUntilDue === 14 && !notified.has(14)) {
        await notifyActionDueSoon(outcome.id, outcome.title, 14, assignedUserIds);
        notified.add(14);
        logger.info(`Sent 14-day due notification for action: ${outcome.title}`);
      } else if (daysUntilDue === 7 && !notified.has(7)) {
        await notifyActionDueSoon(outcome.id, outcome.title, 7, assignedUserIds);
        notified.add(7);
        logger.info(`Sent 7-day due notification for action: ${outcome.title}`);
      } else if (daysUntilDue === 1 && !notified.has(1)) {
        await notifyActionDueSoon(outcome.id, outcome.title, 1, assignedUserIds);
        notified.add(1);
        logger.info(`Sent 1-day due notification for action: ${outcome.title}`);
      }

      // Check for overdue (1, 7 days past due)
      const daysPastDue = Math.abs(daysUntilDue);
      if (daysUntilDue < 0) {
        if (daysPastDue === 1 && !notified.has(-1)) {
          await notifyActionOverdue(outcome.id, outcome.title, 1, assignedUserIds);
          notified.add(-1);
          logger.info(`Sent 1-day overdue notification for action: ${outcome.title}`);
        } else if (daysPastDue === 7 && !notified.has(-7)) {
          await notifyActionOverdue(outcome.id, outcome.title, 7, assignedUserIds);
          notified.add(-7);
          logger.info(`Sent 7-day overdue notification for action: ${outcome.title}`);
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
