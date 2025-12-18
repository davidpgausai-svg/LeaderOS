import { logger } from './logger';
import * as pgFunctions from './pgStorage';
import { getUncachableStripeClient } from './stripeClient';
import type { User } from '@shared/schema';

const APP_URL = process.env.APP_URL 
  ? process.env.APP_URL.replace(/\/$/, '')
  : process.env.REPLIT_DEV_DOMAIN 
  ? `https://${process.env.REPLIT_DEV_DOMAIN}`
  : process.env.REPLIT_DOMAINS
  ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
  : 'http://localhost:5000';

interface TrialInfo {
  organizationId: string;
  subscriptionId: string;
  trialEnd: Date;
  trialDaysRemaining: number;
  adminEmail: string;
  adminFirstName: string | null;
}

interface CancellationInfo {
  organizationId: string;
  subscriptionId: string;
  cancelAt: Date;
  daysUntilCancel: number;
  adminEmail: string;
  adminFirstName: string | null;
}

async function getAdminForOrganization(organizationId: string): Promise<{ email: string; firstName: string | null } | null> {
  const users = await pgFunctions.getUsersByOrganization(organizationId);
  const admin = users.find(u => u.role === 'administrator');
  if (admin && admin.email) {
    return { email: admin.email, firstName: admin.firstName || null };
  }
  return null;
}

export async function getTrialingOrganizations(): Promise<TrialInfo[]> {
  const stripe = await getUncachableStripeClient();
  const trialOrgs: TrialInfo[] = [];
  
  for await (const sub of stripe.subscriptions.list({
    status: 'trialing',
    limit: 100,
    expand: ['data.customer'],
  })) {
    if (!sub.trial_end) continue;
    
    const trialEnd = new Date(sub.trial_end * 1000);
    const now = new Date();
    const msPerDay = 24 * 60 * 60 * 1000;
    const daysRemaining = Math.floor((trialEnd.getTime() - now.getTime()) / msPerDay);
    
    const org = await pgFunctions.getOrganizationByStripeSubscriptionId(sub.id);
    if (!org) continue;
    
    const admin = await getAdminForOrganization(org.id);
    if (!admin) continue;
    
    trialOrgs.push({
      organizationId: org.id,
      subscriptionId: sub.id,
      trialEnd,
      trialDaysRemaining: daysRemaining,
      adminEmail: admin.email,
      adminFirstName: admin.firstName,
    });
  }
  
  return trialOrgs;
}

export async function getCancelingOrganizations(): Promise<CancellationInfo[]> {
  const stripe = await getUncachableStripeClient();
  const cancelingOrgs: CancellationInfo[] = [];
  
  for await (const sub of stripe.subscriptions.list({
    status: 'active',
    limit: 100,
    expand: ['data.customer'],
  })) {
    if (!sub.cancel_at_period_end || !(sub as any).current_period_end) continue;
    
    const cancelAt = new Date((sub as any).current_period_end * 1000);
    const now = new Date();
    const msPerDay = 24 * 60 * 60 * 1000;
    const daysUntilCancel = Math.floor((cancelAt.getTime() - now.getTime()) / msPerDay);
    
    const org = await pgFunctions.getOrganizationByStripeSubscriptionId(sub.id);
    if (!org) continue;
    
    const admin = await getAdminForOrganization(org.id);
    if (!admin) continue;
    
    cancelingOrgs.push({
      organizationId: org.id,
      subscriptionId: sub.id,
      cancelAt,
      daysUntilCancel,
      adminEmail: admin.email,
      adminFirstName: admin.firstName,
    });
  }
  
  return cancelingOrgs;
}

export function getUpgradeLink(): string {
  return `${APP_URL}/settings`;
}

export async function runScheduledEmailJob(): Promise<void> {
  logger.info('[ScheduledEmail] Starting scheduled email job...');
  
  try {
    await processTrialReminders();
    await processCancellationReminders();
    
    logger.info('[ScheduledEmail] Scheduled email job completed');
  } catch (error) {
    logger.error('[ScheduledEmail] Error running scheduled email job', error);
  }
}

async function processTrialReminders(): Promise<void> {
  const { sendTrialReminderEmail } = await import('./email');
  const trialOrgs = await getTrialingOrganizations();
  
  for (const trial of trialOrgs) {
    const daysRemaining = trial.trialDaysRemaining;
    
    if (daysRemaining === 4) {
      await sendTrialEmailIfNotSent(trial, 'trial_day_3', 4, sendTrialReminderEmail);
    } else if (daysRemaining === 2) {
      await sendTrialEmailIfNotSent(trial, 'trial_day_5', 2, sendTrialReminderEmail);
    } else if (daysRemaining === 0) {
      await sendTrialEmailIfNotSent(trial, 'trial_day_7', 0, sendTrialReminderEmail);
    }
  }
}

async function sendTrialEmailIfNotSent(
  trial: TrialInfo,
  emailType: string,
  daysRemaining: number,
  sendFn: (email: string, firstName: string | null, daysRemaining: number, upgradeLink: string) => Promise<boolean>
): Promise<void> {
  const alreadySent = await pgFunctions.hasEmailBeenSent(
    trial.organizationId,
    emailType,
    trial.subscriptionId
  );
  
  if (alreadySent) {
    logger.info(`[ScheduledEmail] ${emailType} already sent for org ${trial.organizationId}`);
    return;
  }
  
  const upgradeLink = getUpgradeLink();
  const success = await sendFn(trial.adminEmail, trial.adminFirstName, daysRemaining, upgradeLink);
  
  if (success) {
    await pgFunctions.createSentEmailNotification({
      organizationId: trial.organizationId,
      emailType,
      recipientEmail: trial.adminEmail,
      stripeSubscriptionId: trial.subscriptionId,
    });
    logger.info(`[ScheduledEmail] Sent ${emailType} to ${trial.adminEmail}`);
  }
}

async function processCancellationReminders(): Promise<void> {
  const { sendCancellationReminderEmail } = await import('./email');
  const cancelingOrgs = await getCancelingOrganizations();
  
  for (const cancel of cancelingOrgs) {
    const daysUntilCancel = cancel.daysUntilCancel;
    
    if (daysUntilCancel === 3) {
      await sendCancelEmailIfNotSent(cancel, 'cancel_3_days', 3, sendCancellationReminderEmail);
    } else if (daysUntilCancel === 0) {
      await sendCancelEmailIfNotSent(cancel, 'cancel_day_of', 0, sendCancellationReminderEmail);
    }
  }
}

async function sendCancelEmailIfNotSent(
  cancel: CancellationInfo,
  emailType: string,
  daysUntilCancel: number,
  sendFn: (email: string, firstName: string | null, daysUntilCancel: number, cancelDate: Date) => Promise<boolean>
): Promise<void> {
  const alreadySent = await pgFunctions.hasEmailBeenSent(
    cancel.organizationId,
    emailType,
    cancel.subscriptionId
  );
  
  if (alreadySent) {
    logger.info(`[ScheduledEmail] ${emailType} already sent for org ${cancel.organizationId}`);
    return;
  }
  
  const success = await sendFn(cancel.adminEmail, cancel.adminFirstName, daysUntilCancel, cancel.cancelAt);
  
  if (success) {
    await pgFunctions.createSentEmailNotification({
      organizationId: cancel.organizationId,
      emailType,
      recipientEmail: cancel.adminEmail,
      stripeSubscriptionId: cancel.subscriptionId,
    });
    logger.info(`[ScheduledEmail] Sent ${emailType} to ${cancel.adminEmail}`);
  }
}
