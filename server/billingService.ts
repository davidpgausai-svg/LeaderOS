import type Stripe from 'stripe';
import { getUncachableStripeClient } from './stripeClient';
import { PostgresStorage } from './pgStorage';
import * as pgFunctions from './pgStorage';
import type { Organization, SubscriptionPlan, SubscriptionStatus, BillingInterval } from '@shared/schema';

const pgStorage = new PostgresStorage();

// Organizations with free access (bypass all billing restrictions)
// These are legacy/test organizations that should have full access
const FREE_ACCESS_ORG_IDS = new Set([
  '71837e76-6af2-4b1d-890a-ed25d66fc0ea', // Production test environment
]);

function hasFreeAccess(organizationId: string): boolean {
  return FREE_ACCESS_ORG_IDS.has(organizationId);
}

// Stripe Price IDs for each plan
// These include both test and live mode prices - Stripe automatically uses the right ones
// Test mode prices (sandbox): price_1Sdx...
// Live mode prices: price_1Sdz...
export const PRICE_IDS = {
  starter: {
    monthly: 'price_1SdxDMAPmlCUuC3zt16HQ6hR', // test
    monthlyLive: 'price_1SdzfWH5ttU72wpZ7mVcFWqj', // live
  },
  leaderpro: {
    monthly: 'price_1SdxDMAPmlCUuC3zrwwZFojc', // test
    annual: 'price_1SdxDMAPmlCUuC3z1eidVw7P', // test
    monthlyLive: 'price_1SdziQH5ttU72wpZE8B3UZDf', // live
    annualLive: 'price_1Sf6bMH5ttU72wpZzPUPmyV8', // live - $120/year
  },
  team: {
    monthly: 'price_1SdxDNAPmlCUuC3zCMeKd0bV', // test
    annual: 'price_1SdxDNAPmlCUuC3zOcpRsQ3S', // test
    monthlyLive: 'price_1Sdzl2H5ttU72wpZhrhH2ifK', // live
    annualLive: 'price_1Sf6bhH5ttU72wpZgSCvznWL', // live - $220/year
  },
  teamSeat: {
    monthly: 'price_1SdxDOAPmlCUuC3z1JC3NDy2',
    annual: 'price_1SdxDOAPmlCUuC3zgGeGd9sp',
    monthlyLive: 'price_1Se1VpH5ttU72wpZ2PeWFafx', // live - $6/mo per additional team member
  },
};

// Map price IDs to plan info for checkout.session.completed handling
export function getPlanFromPriceId(priceId: string): { plan: SubscriptionPlan; interval: BillingInterval } | null {
  const priceMap: Record<string, { plan: SubscriptionPlan; interval: BillingInterval }> = {
    // Starter (monthly only)
    [PRICE_IDS.starter.monthly]: { plan: 'starter', interval: 'monthly' },
    [PRICE_IDS.starter.monthlyLive]: { plan: 'starter', interval: 'monthly' },
    // LeaderPro
    [PRICE_IDS.leaderpro.monthly]: { plan: 'leaderpro', interval: 'monthly' },
    [PRICE_IDS.leaderpro.monthlyLive]: { plan: 'leaderpro', interval: 'monthly' },
    [PRICE_IDS.leaderpro.annual]: { plan: 'leaderpro', interval: 'annual' },
    [PRICE_IDS.leaderpro.annualLive]: { plan: 'leaderpro', interval: 'annual' },
    // Team
    [PRICE_IDS.team.monthly]: { plan: 'team', interval: 'monthly' },
    [PRICE_IDS.team.monthlyLive]: { plan: 'team', interval: 'monthly' },
    [PRICE_IDS.team.annual]: { plan: 'team', interval: 'annual' },
    [PRICE_IDS.team.annualLive]: { plan: 'team', interval: 'annual' },
  };
  return priceMap[priceId] || null;
}

export const PLAN_LIMITS = {
  starter: {
    maxStrategies: 1,
    maxProjects: 4,
    maxUsers: 1,
    smeTagging: false,
    teamFeatures: false
  },
  leaderpro: {
    maxStrategies: null,
    maxProjects: null,
    maxUsers: 1,
    smeTagging: true,
    teamFeatures: false
  },
  team: {
    maxStrategies: null,
    maxProjects: null,
    maxUsers: 6,
    smeTagging: true,
    teamFeatures: true
  },
  legacy: {
    maxStrategies: null,
    maxProjects: null,
    maxUsers: 6,
    smeTagging: true,
    teamFeatures: true
  }
};

class BillingService {
  async createCustomer(organizationId: string, email: string, name: string): Promise<Stripe.Customer> {
    const stripe = await getUncachableStripeClient();
    
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        organizationId,
      },
    });

    await pgFunctions.updateOrganizationSubscription(organizationId, {
      stripeCustomerId: customer.id,
    });

    return customer;
  }

  async createCheckoutSession(
    organizationId: string,
    priceId: string,
    successUrl: string,
    cancelUrl: string,
    options: {
      trialDays?: number;
      extraSeats?: number;
    } = {}
  ): Promise<Stripe.Checkout.Session> {
    const stripe = await getUncachableStripeClient();
    const org = await pgFunctions.getOrganization(organizationId);
    
    if (!org) {
      throw new Error('Organization not found');
    }

    let customerId = org.stripeCustomerId;
    
    if (!customerId) {
      const admins = await pgStorage.getUsersByOrganization(organizationId);
      const admin = admins.find((u: { role: string }) => u.role === 'administrator') || admins[0];
      
      if (!admin?.email) {
        throw new Error('No admin email found for organization');
      }
      
      const customer = await this.createCustomer(organizationId, admin.email, org.name);
      customerId = customer.id;
    }

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      { price: priceId, quantity: 1 }
    ];

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        organizationId,
      },
      subscription_data: {
        metadata: {
          organizationId,
        },
      },
    };

    if (options.trialDays && options.trialDays > 0) {
      sessionParams.subscription_data!.trial_period_days = options.trialDays;
    }

    return await stripe.checkout.sessions.create(sessionParams);
  }

  async createAnonymousCheckoutSession(
    priceId: string,
    successUrl: string,
    cancelUrl: string,
    options: {
      trialDays?: number;
    } = {}
  ): Promise<Stripe.Checkout.Session> {
    const stripe = await getUncachableStripeClient();

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      { price: priceId, quantity: 1 }
    ];

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        flow: 'new_customer_purchase',
      },
      subscription_data: {
        metadata: {
          flow: 'new_customer_purchase',
        },
      },
    };

    if (options.trialDays && options.trialDays > 0) {
      sessionParams.subscription_data!.trial_period_days = options.trialDays;
    }

    return await stripe.checkout.sessions.create(sessionParams);
  }

  async retrieveCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session | null> {
    try {
      const stripe = await getUncachableStripeClient();
      return await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['subscription', 'customer'],
      });
    } catch (error) {
      console.error('[Billing] Error retrieving checkout session:', error);
      return null;
    }
  }

  async createCustomerPortalSession(
    organizationId: string,
    returnUrl: string
  ): Promise<Stripe.BillingPortal.Session> {
    const stripe = await getUncachableStripeClient();
    const org = await pgFunctions.getOrganization(organizationId);
    
    if (!org?.stripeCustomerId) {
      throw new Error('Organization has no Stripe customer');
    }

    return await stripe.billingPortal.sessions.create({
      customer: org.stripeCustomerId,
      return_url: returnUrl,
    });
  }

  async cancelSubscription(
    organizationId: string,
    cancelAtPeriodEnd: boolean = true
  ): Promise<void> {
    const stripe = await getUncachableStripeClient();
    const org = await pgFunctions.getOrganization(organizationId);
    
    if (!org?.stripeSubscriptionId) {
      throw new Error('Organization has no active subscription');
    }

    if (cancelAtPeriodEnd) {
      await stripe.subscriptions.update(org.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });
      
      await pgFunctions.updateOrganizationSubscription(organizationId, {
        cancelAtPeriodEnd: 'true',
      });
    } else {
      await stripe.subscriptions.cancel(org.stripeSubscriptionId);
    }
  }

  async reactivateSubscription(organizationId: string): Promise<void> {
    const stripe = await getUncachableStripeClient();
    const org = await pgFunctions.getOrganization(organizationId);
    
    if (!org?.stripeSubscriptionId) {
      throw new Error('Organization has no subscription to reactivate');
    }

    await stripe.subscriptions.update(org.stripeSubscriptionId, {
      cancel_at_period_end: false,
    });
    
    await pgFunctions.updateOrganizationSubscription(organizationId, {
      cancelAtPeriodEnd: 'false',
    });
  }

  async scheduleDowngrade(
    organizationId: string,
    newPlan: SubscriptionPlan
  ): Promise<void> {
    await pgFunctions.updateOrganizationSubscription(organizationId, {
      pendingDowngradePlan: newPlan,
    });

    const org = await pgFunctions.getOrganization(organizationId);
    await pgFunctions.createBillingHistoryEntry({
      organizationId,
      eventType: 'downgrade_scheduled',
      description: `Scheduled downgrade to ${newPlan} plan at end of billing period`,
      planBefore: org?.subscriptionPlan || null,
      planAfter: newPlan,
    });
  }

  async cancelPendingDowngrade(organizationId: string): Promise<void> {
    const org = await pgFunctions.getOrganization(organizationId);
    
    if (!org?.pendingDowngradePlan) {
      throw new Error('No pending downgrade to cancel');
    }

    await pgFunctions.updateOrganizationSubscription(organizationId, {
      pendingDowngradePlan: null,
    });

    await pgFunctions.createBillingHistoryEntry({
      organizationId,
      eventType: 'downgrade_cancelled',
      description: `Cancelled pending downgrade to ${org.pendingDowngradePlan}`,
      planBefore: org.subscriptionPlan,
      planAfter: org.subscriptionPlan,
    });
  }

  async handleSubscriptionChange(subscription: Stripe.Subscription): Promise<void> {
    const organizationId = subscription.metadata?.organizationId;
    
    if (!organizationId) {
      console.log('[Billing] Subscription has no organizationId in metadata, skipping');
      return;
    }

    const priceId = subscription.items.data[0]?.price?.id;
    const plan = this.getPlanFromPriceId(priceId);
    const interval = subscription.items.data[0]?.price?.recurring?.interval === 'year' ? 'annual' : 'monthly';
    
    let status: SubscriptionStatus = 'active';
    if (subscription.status === 'trialing') status = 'trialing';
    else if (subscription.status === 'past_due') status = 'past_due';
    else if (subscription.status === 'canceled') status = 'canceled';

    const planLimits = PLAN_LIMITS[plan];

    await pgFunctions.updateOrganizationSubscription(organizationId, {
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      subscriptionPlan: plan,
      subscriptionStatus: status,
      billingInterval: interval,
      currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
      currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
      trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
      cancelAtPeriodEnd: subscription.cancel_at_period_end ? 'true' : 'false',
      maxUsers: planLimits.maxUsers,
      pendingDowngradePlan: null,
      paymentFailedAt: null,
    });

    await pgFunctions.createBillingHistoryEntry({
      organizationId,
      eventType: 'subscription_updated',
      description: `Subscription updated to ${plan} (${interval})`,
      planAfter: plan,
    });

    console.log(`[Billing] Updated subscription for org ${organizationId}: ${plan} (${status})`);
  }

  async handleSubscriptionCanceled(subscription: Stripe.Subscription): Promise<void> {
    const organizationId = subscription.metadata?.organizationId;
    
    if (!organizationId) {
      console.log('[Billing] Canceled subscription has no organizationId, skipping');
      return;
    }

    await pgFunctions.updateOrganizationSubscription(organizationId, {
      subscriptionStatus: 'canceled',
      stripeSubscriptionId: null,
      stripePriceId: null,
    });

    await pgFunctions.createBillingHistoryEntry({
      organizationId,
      eventType: 'subscription_canceled',
      description: 'Subscription canceled',
    });

    console.log(`[Billing] Subscription canceled for org ${organizationId}`);
  }

  async handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    const customerId = invoice.customer as string;
    const org = await pgFunctions.getOrganizationByStripeCustomerId(customerId);
    
    if (!org) {
      console.log('[Billing] Payment succeeded for unknown customer:', customerId);
      return;
    }

    if (org.paymentFailedAt) {
      await pgFunctions.updateOrganizationSubscription(org.id, {
        subscriptionStatus: 'active',
        paymentFailedAt: null,
        lastPaymentReminderAt: null,
      });
    }

    await pgFunctions.createBillingHistoryEntry({
      organizationId: org.id,
      eventType: 'payment_succeeded',
      description: `Payment of $${(invoice.amount_paid / 100).toFixed(2)} succeeded`,
      amountCents: invoice.amount_paid,
      currency: invoice.currency,
      stripeInvoiceId: invoice.id,
    });

    console.log(`[Billing] Payment succeeded for org ${org.id}: $${invoice.amount_paid / 100}`);
  }

  async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const customerId = invoice.customer as string;
    const org = await pgFunctions.getOrganizationByStripeCustomerId(customerId);
    
    if (!org) {
      console.log('[Billing] Payment failed for unknown customer:', customerId);
      return;
    }

    const now = new Date();
    const gracePeriodEnds = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    await pgFunctions.updateOrganizationSubscription(org.id, {
      subscriptionStatus: 'past_due',
      paymentFailedAt: now,
    });

    await pgFunctions.createPaymentFailure({
      organizationId: org.id,
      stripeInvoiceId: invoice.id,
      amountCents: invoice.amount_due,
      currency: invoice.currency || 'usd',
      failureReason: invoice.last_finalization_error?.message || 'Payment failed',
      gracePeriodEndsAt: gracePeriodEnds,
    });

    await pgFunctions.createBillingHistoryEntry({
      organizationId: org.id,
      eventType: 'payment_failed',
      description: `Payment of $${(invoice.amount_due / 100).toFixed(2)} failed`,
      amountCents: invoice.amount_due,
      currency: invoice.currency,
      stripeInvoiceId: invoice.id,
    });

    console.log(`[Billing] Payment failed for org ${org.id}: $${invoice.amount_due / 100}`);
  }

  async handleTrialEnding(subscription: Stripe.Subscription): Promise<void> {
    const organizationId = subscription.metadata?.organizationId;
    
    if (!organizationId) {
      console.log('[Billing] Trial ending for subscription with no organizationId');
      return;
    }

    console.log(`[Billing] Trial ending for org ${organizationId} at ${new Date(subscription.trial_end! * 1000)}`);
  }

  getPlanFromPriceId(priceId: string | undefined): SubscriptionPlan {
    if (!priceId) return 'starter';
    
    // Price IDs from Stripe - maps to LeaderOS plans
    const priceMapping: Record<string, SubscriptionPlan> = {
      // Starter ($1/mo)
      'price_1SdxDMAPmlCUuC3zt16HQ6hR': 'starter',
      // LeaderPro ($12/mo, $120/yr)
      'price_1SdxDMAPmlCUuC3zrwwZFojc': 'leaderpro',
      'price_1SdxDMAPmlCUuC3z1eidVw7P': 'leaderpro',
      // Team ($22/mo, $220/yr)
      'price_1SdxDNAPmlCUuC3zCMeKd0bV': 'team',
      'price_1SdxDNAPmlCUuC3zOcpRsQ3S': 'team',
    };
    
    return priceMapping[priceId] || 'starter';
  }

  getPlanLimits(plan: SubscriptionPlan) {
    return PLAN_LIMITS[plan] || PLAN_LIMITS.starter;
  }

  async checkPlanLimits(
    organizationId: string,
    resourceType: 'strategy' | 'project' | 'user'
  ): Promise<{ allowed: boolean; limit: number | null; current: number; message?: string }> {
    const org = await pgFunctions.getOrganization(organizationId);
    
    if (!org) {
      return { allowed: false, limit: 0, current: 0, message: 'Organization not found' };
    }

    // Free access organizations bypass all billing restrictions
    if (hasFreeAccess(organizationId) || org.isLegacy === 'true') {
      return { allowed: true, limit: null, current: 0 };
    }

    const plan = org.subscriptionPlan as SubscriptionPlan;
    const limits = PLAN_LIMITS[plan];

    if (resourceType === 'strategy') {
      const strategies = await pgStorage.getStrategiesByOrganization(organizationId);
      const current = strategies.filter((s: { status: string }) => s.status !== 'Archived').length;
      const limit = limits.maxStrategies;
      
      if (limit !== null && current >= limit) {
        return {
          allowed: false,
          limit,
          current,
          message: `You've reached the limit of ${limit} strategic ${limit === 1 ? 'priority' : 'priorities'} on the ${plan} plan. Upgrade to add more.`
        };
      }
      
      return { allowed: true, limit, current };
    }

    if (resourceType === 'project') {
      const projects = await pgStorage.getProjectsByOrganization(organizationId);
      const current = projects.filter((p: { isArchived: string }) => p.isArchived !== 'true').length;
      const limit = limits.maxProjects;
      
      if (limit !== null && current >= limit) {
        return {
          allowed: false,
          limit,
          current,
          message: `You've reached the limit of ${limit} projects on the ${plan} plan. Upgrade to add more.`
        };
      }
      
      return { allowed: true, limit, current };
    }

    if (resourceType === 'user') {
      const users = await pgStorage.getUsersByOrganization(organizationId);
      const current = users.length;
      const baseLimit = limits.maxUsers;
      const totalLimit = baseLimit + (org.extraSeats || 0);
      
      if (current >= totalLimit) {
        if (plan === 'team') {
          return {
            allowed: false,
            limit: totalLimit,
            current,
            message: `You have ${current} users. Add more seats ($6/month each) to invite additional team members.`
          };
        }
        return {
          allowed: false,
          limit: totalLimit,
          current,
          message: `The ${plan} plan allows only ${baseLimit} user${baseLimit === 1 ? '' : 's'}. Upgrade to add team members.`
        };
      }
      
      return { allowed: true, limit: totalLimit, current };
    }

    return { allowed: true, limit: null, current: 0 };
  }

  async getEditableStrategyIds(organizationId: string): Promise<{
    editableIds: string[];
    readOnlyIds: string[];
    limit: number | null;
    total: number;
  }> {
    const org = await pgFunctions.getOrganization(organizationId);
    
    if (!org) {
      return { editableIds: [], readOnlyIds: [], limit: 0, total: 0 };
    }

    // Free access organizations bypass all billing restrictions
    if (hasFreeAccess(organizationId) || org.isLegacy === 'true') {
      const strategies = await pgStorage.getStrategiesByOrganization(organizationId);
      const activeStrategies = strategies.filter((s: any) => s.status !== 'Archived');
      return {
        editableIds: activeStrategies.map((s: any) => s.id),
        readOnlyIds: [],
        limit: null,
        total: activeStrategies.length
      };
    }

    const plan = org.subscriptionPlan as SubscriptionPlan;
    const limits = PLAN_LIMITS[plan];
    const strategies = await pgStorage.getStrategiesByOrganization(organizationId);
    const activeStrategies = strategies
      .filter((s: any) => s.status !== 'Archived')
      .sort((a: any, b: any) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return aTime - bTime;
      });
    
    const limit = limits.maxStrategies;
    
    if (limit === null) {
      return {
        editableIds: activeStrategies.map((s: any) => s.id),
        readOnlyIds: [],
        limit: null,
        total: activeStrategies.length
      };
    }

    const editableStrategies = activeStrategies.slice(0, limit);
    const readOnlyStrategies = activeStrategies.slice(limit);

    return {
      editableIds: editableStrategies.map((s: any) => s.id),
      readOnlyIds: readOnlyStrategies.map((s: any) => s.id),
      limit,
      total: activeStrategies.length
    };
  }

  async addTeamSeats(organizationId: string, seatsToAdd: number): Promise<void> {
    const org = await pgFunctions.getOrganization(organizationId);
    
    if (!org || org.subscriptionPlan !== 'team') {
      throw new Error('Only Team plan organizations can add extra seats');
    }

    const newExtraSeats = (org.extraSeats || 0) + seatsToAdd;
    
    await pgFunctions.updateOrganizationSubscription(organizationId, {
      pendingExtraSeats: newExtraSeats,
    });

    await pgFunctions.createBillingHistoryEntry({
      organizationId,
      eventType: 'seats_added',
      description: `Added ${seatsToAdd} extra seat(s) (pending until next billing cycle)`,
      seatsBefore: org.extraSeats || 0,
      seatsAfter: newExtraSeats,
    });
  }

  async getOrganizationBillingInfo(organizationId: string) {
    const org = await pgFunctions.getOrganization(organizationId);
    
    if (!org) {
      throw new Error('Organization not found');
    }

    const users = await pgStorage.getUsersByOrganization(organizationId);
    const billingHistory = await pgFunctions.getBillingHistoryByOrganization(organizationId);
    const planLimits = PLAN_LIMITS[org.subscriptionPlan as SubscriptionPlan];

    return {
      organization: org,
      currentPlan: org.subscriptionPlan,
      status: org.subscriptionStatus,
      interval: org.billingInterval,
      isLegacy: org.isLegacy === 'true',
      userCount: users.length,
      maxUsers: org.maxUsers + (org.extraSeats || 0),
      extraSeats: org.extraSeats || 0,
      limits: planLimits,
      trialEndsAt: org.trialEndsAt,
      currentPeriodEnd: org.currentPeriodEnd,
      cancelAtPeriodEnd: org.cancelAtPeriodEnd === 'true',
      pendingDowngrade: org.pendingDowngradePlan,
      paymentFailed: !!org.paymentFailedAt,
      billingHistory: billingHistory.slice(0, 20),
    };
  }

  async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<{ isNewCustomer: boolean; organizationId?: string; tempPassword?: string }> {
    console.log('[Billing] Processing checkout.session.completed:', session.id);
    
    const customerEmail = session.customer_details?.email;
    const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
    const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
    
    if (!customerEmail) {
      // Can't auto-provision without email - log and return
      console.warn('[Billing] No customer email in checkout session - skipping auto-provision');
      return { isNewCustomer: false };
    }

    // Check if we already have an organization linked to this Stripe customer
    if (customerId) {
      const existingOrg = await pgFunctions.getOrganizationByStripeCustomerId(customerId);
      if (existingOrg) {
        console.log(`[Billing] Existing customer found, org: ${existingOrg.id}`);
        return { isNewCustomer: false, organizationId: existingOrg.id };
      }
    }

    // Check if a user with this email already exists
    const existingUser = await pgFunctions.getUserByEmail(customerEmail);
    if (existingUser && existingUser.organizationId) {
      console.log(`[Billing] User with email ${customerEmail} already exists in org ${existingUser.organizationId}`);
      // Link the Stripe customer to their existing organization
      if (customerId && subscriptionId) {
        await pgFunctions.updateOrganizationSubscription(existingUser.organizationId, {
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
        });
      }
      return { isNewCustomer: false, organizationId: existingUser.organizationId };
    }

    // This is a new customer - auto-provision account
    console.log(`[Billing] New customer, auto-provisioning account for ${customerEmail}`);
    
    // Get subscription details to determine plan
    const stripe = await getUncachableStripeClient();
    let plan: SubscriptionPlan = 'starter';
    let interval: BillingInterval = 'monthly';
    let currentPeriodEnd: Date | null = null;

    if (subscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const priceId = subscription.items.data[0]?.price.id;
      if (priceId) {
        const planInfo = getPlanFromPriceId(priceId);
        if (planInfo) {
          plan = planInfo.plan;
          interval = planInfo.interval;
        }
      }
      // Safely parse current_period_end timestamp
      const periodEndTimestamp = (subscription as any).current_period_end;
      if (periodEndTimestamp && typeof periodEndTimestamp === 'number' && periodEndTimestamp > 0) {
        currentPeriodEnd = new Date(periodEndTimestamp * 1000);
        // Validate the date is valid
        if (isNaN(currentPeriodEnd.getTime())) {
          currentPeriodEnd = null;
        }
      }
    }

    // Create organization
    const orgName = session.customer_details?.name || customerEmail.split('@')[0] + "'s Organization";
    const newOrg = await pgFunctions.createOrganization(orgName);
    
    // Update organization with Stripe info and subscription details
    await pgFunctions.updateOrganizationSubscription(newOrg.id, {
      stripeCustomerId: customerId || undefined,
      stripeSubscriptionId: subscriptionId || undefined,
      subscriptionPlan: plan,
      subscriptionStatus: 'active',
      billingInterval: interval,
      currentPeriodEnd: currentPeriodEnd || undefined,
    });

    // Generate temporary password
    const tempPassword = this.generateTempPassword();
    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Parse customer name safely (handle missing name, single-word names, etc.)
    const customerName = session.customer_details?.name || '';
    const nameParts = customerName.trim().split(/\s+/).filter(Boolean);
    const firstName = nameParts[0] || 'User';
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

    // Create admin user with mustChangePassword flag
    await pgStorage.createUser({
      email: customerEmail,
      passwordHash: hashedPassword,
      firstName,
      lastName,
      role: 'administrator',
      organizationId: newOrg.id,
      mustChangePassword: 'true', // User must change temp password on first login
    });

    console.log(`[Billing] Auto-provisioned org ${newOrg.id} with admin user ${customerEmail} on ${plan} plan`);

    // Log billing history
    await pgFunctions.createBillingHistoryEntry({
      organizationId: newOrg.id,
      eventType: 'subscription_created',
      description: `Account auto-provisioned via Stripe checkout. Plan: ${plan} (${interval})`,
      planBefore: null,
      planAfter: plan,
    });

    return { isNewCustomer: true, organizationId: newOrg.id, tempPassword };
  }

  private generateTempPassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }
}

export const billingService = new BillingService();
