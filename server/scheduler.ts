import { storage } from './storage';
import { notifyActionDueSoon, notifyActionOverdue } from './notifications';
import { logger } from './logger';

const notifiedActions = new Map<string, Set<string>>();

export function clearActionNotificationTracking(actionId: string) {
  notifiedActions.delete(actionId);
}

async function checkDueDateNotifications() {
  try {
    const allStrategies = await storage.getAllStrategies();
    
    for (const strategy of allStrategies) {
      if (strategy.status === 'Archived') continue;
      
      const projects = await storage.getProjectsByStrategy(strategy.id);
      for (const project of projects) {
        const actions = await storage.getActionsByProject(project.id);
        for (const action of actions) {
          if (action.status === 'Completed' || action.status === 'Achieved') continue;
          if (!action.dueDate) continue;

          const now = new Date();
          const dueDate = new Date(action.dueDate);
          const diffMs = dueDate.getTime() - now.getTime();
          const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

          const actionKey = action.id;
          if (!notifiedActions.has(actionKey)) {
            notifiedActions.set(actionKey, new Set());
          }
          const notified = notifiedActions.get(actionKey)!;

          const assignedUserIds = action.assignedTo ? [action.assignedTo] : [];
          if (assignedUserIds.length === 0) continue;

          if (diffDays === 14 && !notified.has('due_14')) {
            await notifyActionDueSoon(action.id, action.title, 14, assignedUserIds);
            notified.add('due_14');
          } else if (diffDays === 7 && !notified.has('due_7')) {
            await notifyActionDueSoon(action.id, action.title, 7, assignedUserIds);
            notified.add('due_7');
          } else if (diffDays === 1 && !notified.has('due_1')) {
            await notifyActionDueSoon(action.id, action.title, 1, assignedUserIds);
            notified.add('due_1');
          } else if (diffDays === -1 && !notified.has('overdue_1')) {
            await notifyActionOverdue(action.id, action.title, 1, assignedUserIds);
            notified.add('overdue_1');
          } else if (diffDays === -7 && !notified.has('overdue_7')) {
            await notifyActionOverdue(action.id, action.title, 7, assignedUserIds);
            notified.add('overdue_7');
          }
        }
      }
    }
  } catch (error) {
    logger.error('Error checking due date notifications', error);
  }
}

export function startDueDateScheduler(intervalMinutes: number = 60) {
  logger.info(`Starting due date notification scheduler (interval: ${intervalMinutes} minutes)`);
  checkDueDateNotifications();
  setInterval(checkDueDateNotifications, intervalMinutes * 60 * 1000);
}
