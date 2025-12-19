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
    monthly: 'price_1SdxDOAPmlCUuC3z1JC3NDy2', // test - $6/mo per seat
    annual: 'price_1SdxDOAPmlCUuC3zgGeGd9sp', // test - $60/yr per seat
    monthlyLive: 'price_1Se1VpH5ttU72wpZ2PeWFafx', // live - $6/mo per additional team member
    annualLive: 'price_1Se1VpH5ttU72wpZ2PeWFafx', // live - seats are billed monthly ($6/mo) regardless of base plan interval
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

    // Idempotency check: If org already has an active subscription with the same price, don't create another
    if (org.stripeSubscriptionId && org.stripePriceId === priceId && 
        (org.subscriptionStatus === 'active' || org.subscriptionStatus === 'trialing')) {
      console.log(`[Billing] Organization ${organizationId} already has active subscription with price ${priceId}, blocking duplicate checkout`);
      throw new Error('You already have an active subscription for this plan');
    }

    // Check if there's a pending checkout in Stripe for this customer
    if (org.stripeCustomerId) {
      const recentSessions = await stripe.checkout.sessions.list({
        customer: org.stripeCustomerId,
        limit: 5,
        expand: ['data.line_items'],
      });
      
      // Check for open sessions created in the last 5 minutes for the same price
      const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 300;
      const pendingSession = recentSessions.data.find(s => 
        s.status === 'open' && 
        s.created > fiveMinutesAgo &&
        s.line_items?.data[0]?.price?.id === priceId
      );
      
      if (pendingSession) {
        console.log(`[Billing] Found pending checkout session ${pendingSession.id}, returning it instead of creating new`);
        return pendingSession;
      }
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

  async syncSubscriptionFromStripe(organizationId: string): Promise<{ plan: string; status: string }> {
    const stripe = await getUncachableStripeClient();
    const org = await pgFunctions.getOrganization(organizationId);
    
    if (!org?.stripeCustomerId) {
      throw new Error('Organization has no Stripe customer');
    }

    // Get all active/trialing/past_due subscriptions
    const activeStatuses = ['active', 'trialing', 'past_due'] as const;
    let allSubscriptions: Stripe.Subscription[] = [];
    
    for (const status of activeStatuses) {
      const subs = await stripe.subscriptions.list({
        customer: org.stripeCustomerId,
        status: status,
        limit: 10,
      });
      allSubscriptions = allSubscriptions.concat(subs.data);
    }

    if (allSubscriptions.length === 0) {
      // No active subscription found - keep existing plan
      console.log(`[Billing] No active subscription for org ${organizationId}, keeping existing plan: ${org.subscriptionPlan}`);
      return { plan: org.subscriptionPlan || 'starter', status: 'no_active_subscription' };
    }

    // Filter to only subscriptions with a recognized base plan price (exclude add-ons like seat subscriptions)
    const basePlanSubscriptions = allSubscriptions.filter(sub => {
      const priceId = sub.items.data[0]?.price?.id;
      const plan = this.getPlanFromPriceId(priceId);
      return plan !== null; // Only keep subscriptions with recognized plan prices
    });

    // If we found base plan subscriptions, use them; otherwise fall back to all
    const candidateSubscriptions = basePlanSubscriptions.length > 0 ? basePlanSubscriptions : allSubscriptions;

    // Get the most recent subscription (highest current_period_end)
    const subscription = candidateSubscriptions.reduce((latest, current) => {
      const latestEnd = (latest as any).current_period_end || 0;
      const currentEnd = (current as any).current_period_end || 0;
      return currentEnd > latestEnd ? current : latest;
    });
    
    // Use the subscription handler to update the database
    await this.handleSubscriptionChange(subscription);

    // Fetch updated org to return current state
    const updatedOrg = await pgFunctions.getOrganization(organizationId);
    
    console.log(`[Billing] Sync completed for org ${organizationId}: ${updatedOrg?.subscriptionPlan} (from Stripe subscription ${subscription.id})`);

    return { 
      plan: updatedOrg?.subscriptionPlan || 'starter', 
      status: subscription.status 
    };
  }

  async scheduleDowngrade(
    organizationId: string,
    newPlan: SubscriptionPlan
  ): Promise<void> {
    const org = await pgFunctions.getOrganization(organizationId);
    
    if (!org) {
      throw new Error('Organization not found');
    }
    
    if (!org.stripeSubscriptionId) {
      throw new Error('No active subscription to downgrade');
    }
    
    // Validate this is actually a downgrade
    const planHierarchy: Record<string, number> = {
      'starter': 1,
      'leaderpro': 2,
      'team': 3,
    };
    
    const currentLevel = planHierarchy[org.subscriptionPlan || 'starter'] || 1;
    const newLevel = planHierarchy[newPlan] || 1;
    
    if (newLevel >= currentLevel) {
      throw new Error('Cannot downgrade to a plan at the same or higher level');
    }
    
    // Tell Stripe to cancel the subscription at the end of the billing period
    const stripe = await getUncachableStripeClient();
    await stripe.subscriptions.update(org.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });
    
    // Store the pending downgrade plan in our database
    await pgFunctions.updateOrganizationSubscription(organizationId, {
      pendingDowngradePlan: newPlan,
      cancelAtPeriodEnd: 'true',
    });

    await pgFunctions.createBillingHistoryEntry({
      organizationId,
      eventType: 'downgrade_scheduled',
      description: `Scheduled downgrade to ${newPlan} plan at end of billing period`,
      planBefore: org.subscriptionPlan || null,
      planAfter: newPlan,
    });
    
    console.log(`[Billing] Scheduled downgrade for org ${organizationId}: ${org.subscriptionPlan} → ${newPlan}`);
  }

  async cancelPendingDowngrade(organizationId: string): Promise<void> {
    const org = await pgFunctions.getOrganization(organizationId);
    
    if (!org?.pendingDowngradePlan) {
      throw new Error('No pending downgrade to cancel');
    }
    
    // Tell Stripe to NOT cancel at period end (resume the subscription)
    if (org.stripeSubscriptionId) {
      const stripe = await getUncachableStripeClient();
      await stripe.subscriptions.update(org.stripeSubscriptionId, {
        cancel_at_period_end: false,
      });
    }

    await pgFunctions.updateOrganizationSubscription(organizationId, {
      pendingDowngradePlan: null,
      cancelAtPeriodEnd: 'false',
    });

    await pgFunctions.createBillingHistoryEntry({
      organizationId,
      eventType: 'downgrade_cancelled',
      description: `Cancelled pending downgrade to ${org.pendingDowngradePlan}`,
      planBefore: org.subscriptionPlan,
      planAfter: org.subscriptionPlan,
    });
    
    console.log(`[Billing] Cancelled pending downgrade for org ${organizationId}`);
  }

  async handleSubscriptionChange(subscription: Stripe.Subscription): Promise<void> {
    let organizationId = subscription.metadata?.organizationId;
    
    // If no organizationId in metadata, look up by Stripe customer ID
    // This handles upgrades/changes made through the billing portal
    if (!organizationId) {
      const customerId = typeof subscription.customer === 'string' 
        ? subscription.customer 
        : subscription.customer?.id;
      
      if (customerId) {
        const org = await pgFunctions.getOrganizationByStripeCustomerId(customerId);
        if (org) {
          organizationId = org.id;
          console.log(`[Billing] Found organization ${organizationId} by Stripe customer ${customerId}`);
        }
      }
    }
    
    if (!organizationId) {
      console.log('[Billing] Subscription has no organizationId and no matching customer, skipping');
      return;
    }

    const priceId = subscription.items.data[0]?.price?.id;
    let plan = this.getPlanFromPriceId(priceId);
    const interval = subscription.items.data[0]?.price?.recurring?.interval === 'year' ? 'annual' : 'monthly';
    
    // If plan couldn't be determined from priceId, keep existing plan
    if (!plan) {
      const org = await pgFunctions.getOrganization(organizationId);
      plan = (org?.subscriptionPlan as SubscriptionPlan) || 'starter';
      console.log(`[Billing] Could not determine plan from priceId ${priceId}, keeping existing plan: ${plan}`);
    }
    
    let status: SubscriptionStatus = 'active';
    if (subscription.status === 'trialing') status = 'trialing';
    else if (subscription.status === 'past_due') status = 'past_due';
    else if (subscription.status === 'canceled') status = 'canceled';

    const planLimits = PLAN_LIMITS[plan] || PLAN_LIMITS.starter;

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

    // Cancel any other active base-plan subscriptions for this customer
    // This ensures upgrades replace old subscriptions rather than stacking
    const customerId = typeof subscription.customer === 'string' 
      ? subscription.customer 
      : subscription.customer?.id;
    
    if (customerId && (status === 'active' || status === 'trialing')) {
      try {
        await this.cancelOtherBasePlanSubscriptions(customerId, subscription.id);
      } catch (error) {
        console.error(`[Billing] Failed to cancel old subscriptions for customer ${customerId}:`, error);
        // Don't throw - the new subscription is already active
      }
    }

    await pgFunctions.createBillingHistoryEntry({
      organizationId,
      eventType: 'subscription_updated',
      description: `Subscription updated to ${plan} (${interval})`,
      planAfter: plan,
    });

    console.log(`[Billing] Updated subscription for org ${organizationId}: ${plan} (${status})`);
  }

  async handleSubscriptionCanceled(subscription: Stripe.Subscription): Promise<void> {
    let organizationId = subscription.metadata?.organizationId;
    
    // If no organizationId in metadata, look up by Stripe customer ID
    const customerId = typeof subscription.customer === 'string' 
      ? subscription.customer 
      : subscription.customer?.id;
    
    if (!organizationId && customerId) {
      const org = await pgFunctions.getOrganizationByStripeCustomerId(customerId);
      if (org) {
        organizationId = org.id;
        console.log(`[Billing] Found organization ${organizationId} by Stripe customer ${customerId}`);
      }
    }
    
    if (!organizationId) {
      console.log('[Billing] Canceled subscription has no organizationId and no matching customer, skipping');
      return;
    }
    
    // Check if this is a scheduled downgrade
    const org = await pgFunctions.getOrganization(organizationId);
    
    if (org?.pendingDowngradePlan && customerId) {
      // This is a downgrade - create the new lower-tier subscription
      console.log(`[Billing] Processing downgrade for org ${organizationId}: → ${org.pendingDowngradePlan}`);
      
      try {
        await this.createDowngradeSubscription(customerId, organizationId, org.pendingDowngradePlan as SubscriptionPlan);
        
        await pgFunctions.createBillingHistoryEntry({
          organizationId,
          eventType: 'subscription_downgraded',
          description: `Downgraded to ${org.pendingDowngradePlan} plan`,
          planBefore: org.subscriptionPlan,
          planAfter: org.pendingDowngradePlan,
        });
        
        console.log(`[Billing] Downgrade complete for org ${organizationId}: ${org.subscriptionPlan} → ${org.pendingDowngradePlan}`);
        return; // Don't mark as canceled since we created a new subscription
      } catch (error) {
        console.error(`[Billing] Failed to create downgrade subscription for org ${organizationId}:`, error);
        // Fall through to mark as canceled
      }
    }

    // No pending downgrade - just mark as canceled
    await pgFunctions.updateOrganizationSubscription(organizationId, {
      subscriptionStatus: 'canceled',
      stripeSubscriptionId: null,
      stripePriceId: null,
      pendingDowngradePlan: null,
    });

    await pgFunctions.createBillingHistoryEntry({
      organizationId,
      eventType: 'subscription_canceled',
      description: 'Subscription canceled',
    });

    console.log(`[Billing] Subscription canceled for org ${organizationId}`);
  }
  
  /**
   * Create a new subscription for a downgrade (called when old subscription ends)
   */
  async createDowngradeSubscription(
    customerId: string,
    organizationId: string,
    newPlan: SubscriptionPlan
  ): Promise<void> {
    const stripe = await getUncachableStripeClient();
    
    // Get the price ID for the new plan (monthly by default)
    const priceId = this.getPriceIdForPlan(newPlan, 'monthly');
    
    if (!priceId) {
      throw new Error(`No price ID found for plan: ${newPlan}`);
    }
    
    // Create the new subscription
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      metadata: { organizationId },
    });
    
    // Update our database with the new subscription
    const planLimits = PLAN_LIMITS[newPlan] || PLAN_LIMITS.starter;
    
    await pgFunctions.updateOrganizationSubscription(organizationId, {
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      subscriptionPlan: newPlan,
      subscriptionStatus: 'active',
      billingInterval: 'monthly',
      currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
      currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
      cancelAtPeriodEnd: 'false',
      maxUsers: planLimits.maxUsers,
      pendingDowngradePlan: null,
    });
    
    console.log(`[Billing] Created downgrade subscription ${subscription.id} for org ${organizationId}: ${newPlan}`);
  }
  
  /**
   * Get the Stripe price ID for a given plan and interval
   */
  getPriceIdForPlan(plan: SubscriptionPlan, interval: 'monthly' | 'annual'): string | null {
    // Determine if we're in live mode or test mode based on existing config
    const isLiveMode = process.env.STRIPE_SECRET_KEY?.startsWith('sk_live');
    
    const priceMap: Record<string, Record<string, string>> = {
      starter: {
        monthly: isLiveMode ? PRICE_IDS.starter.monthlyLive : PRICE_IDS.starter.monthly,
      },
      leaderpro: {
        monthly: isLiveMode ? PRICE_IDS.leaderpro.monthlyLive : PRICE_IDS.leaderpro.monthly,
        annual: isLiveMode ? PRICE_IDS.leaderpro.annualLive : PRICE_IDS.leaderpro.annual,
      },
      team: {
        monthly: isLiveMode ? PRICE_IDS.team.monthlyLive : PRICE_IDS.team.monthly,
        annual: isLiveMode ? PRICE_IDS.team.annualLive : PRICE_IDS.team.annual,
      },
    };
    
    return priceMap[plan]?.[interval] || null;
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

  getPlanFromPriceId(priceId: string | undefined): SubscriptionPlan | null {
    if (!priceId) return null;
    
    // Use the standalone function which has the complete, up-to-date mapping
    const result = getPlanFromPriceId(priceId);
    return result?.plan || null;
  }

  /**
   * Cancel any other active base-plan subscriptions for a customer when they upgrade.
   * This prevents stacking multiple subscriptions (e.g., Starter + Team both active).
   */
  async cancelOtherBasePlanSubscriptions(customerId: string, keepSubscriptionId: string): Promise<void> {
    const stripe = await getUncachableStripeClient();
    
    // List active subscriptions for this customer
    const activeSubscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      expand: ['data.items.data.price'],
    });
    
    // Also list trialing subscriptions
    const trialingSubscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'trialing',
      expand: ['data.items.data.price'],
    });
    
    // Combine both lists
    const allActiveSubscriptions = [
      ...activeSubscriptions.data,
      ...trialingSubscriptions.data,
    ];
    
    for (const sub of allActiveSubscriptions) {
      // Skip the subscription we want to keep
      if (sub.id === keepSubscriptionId) continue;
      
      // Check if this is a base plan subscription (not an add-on like team seats)
      const priceId = sub.items.data[0]?.price?.id;
      const planInfo = getPlanFromPriceId(priceId || '');
      
      if (planInfo) {
        // This is a recognized base plan - cancel it immediately
        console.log(`[Billing] Cancelling old subscription ${sub.id} (${planInfo.plan}) for customer ${customerId}`);
        
        await stripe.subscriptions.cancel(sub.id, {
          prorate: true, // Give credit for unused time
        });
        
        console.log(`[Billing] Cancelled old subscription ${sub.id}`);
      }
    }
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

  async removeTeamSeats(organizationId: string, seatsToRemove: number): Promise<{ seatsRemoved: number; newSeatCount: number }> {
    const stripe = await getUncachableStripeClient();
    const org = await pgFunctions.getOrganization(organizationId);
    
    if (!org || org.subscriptionPlan !== 'team') {
      throw new Error('Only Team plan organizations can modify seats');
    }

    const currentExtraSeats = org.extraSeats || 0;
    const newExtraSeats = Math.max(0, currentExtraSeats - seatsToRemove);
    const actualSeatsRemoved = currentExtraSeats - newExtraSeats;

    if (actualSeatsRemoved > 0) {
      let stripeUpdated = false;
      
      // Update Stripe subscription first if it exists
      if (org.stripeSubscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(org.stripeSubscriptionId, {
          expand: ['items.data.price.product'],
        });
        
        // Get all known seat price IDs for lookup
        const allSeatPriceIds = [
          PRICE_IDS.teamSeat.monthly,
          PRICE_IDS.teamSeat.monthlyLive,
          PRICE_IDS.teamSeat.annual,
          PRICE_IDS.teamSeat.annualLive,
        ];
        
        // Find seat item by price ID or by product name
        const seatItem = subscription.items.data.find(item => {
          if (allSeatPriceIds.includes(item.price.id)) {
            return true;
          }
          const product = item.price.product;
          if (typeof product === 'object' && product !== null && 'name' in product) {
            const productName = (product as any).name?.toLowerCase() || '';
            return productName.includes('seat') || productName.includes('user');
          }
          return false;
        });

        if (seatItem) {
          // Stripe update - throws on failure, preventing local state change
          if (newExtraSeats === 0) {
            await stripe.subscriptionItems.del(seatItem.id, {
              proration_behavior: 'create_prorations',
            });
          } else {
            await stripe.subscriptionItems.update(seatItem.id, {
              quantity: newExtraSeats,
              proration_behavior: 'create_prorations',
            });
          }
          stripeUpdated = true;
        }
      }

      // Only update local state if:
      // 1. Stripe was successfully updated, OR
      // 2. No Stripe subscription exists (legacy/manual org)
      if (stripeUpdated || !org.stripeSubscriptionId) {
        await pgFunctions.updateOrganizationSubscription(organizationId, {
          extraSeats: newExtraSeats,
          pendingExtraSeats: null,
        });

        await pgFunctions.createBillingHistoryEntry({
          organizationId,
          eventType: 'seats_removed',
          description: `Removed ${actualSeatsRemoved} extra seat(s) - now have ${newExtraSeats} extra seat(s)`,
          seatsBefore: currentExtraSeats,
          seatsAfter: newExtraSeats,
        });
      } else {
        // Stripe sub exists but no seat item found - log warning but don't update local state
        console.warn(`[Billing] No seat item found in Stripe subscription for org ${organizationId} - local state not updated`);
        return { seatsRemoved: 0, newSeatCount: currentExtraSeats };
      }
    }

    return { seatsRemoved: actualSeatsRemoved, newSeatCount: newExtraSeats };
  }

  async adjustSeatsAfterUserDeletion(organizationId: string): Promise<{ seatsReduced: number } | null> {
    const org = await pgFunctions.getOrganization(organizationId);
    
    if (!org || org.subscriptionPlan !== 'team') {
      return null;
    }

    const users = await pgStorage.getUsersByOrganization(organizationId);
    const userCount = users.length;
    const baseLimit = PLAN_LIMITS.team.maxUsers;
    const currentExtraSeats = org.extraSeats || 0;
    
    // Calculate the minimum extra seats needed for current user count
    const minExtraSeatsNeeded = Math.max(0, userCount - baseLimit);
    
    // If we have more extra seats than needed, reduce them
    if (currentExtraSeats > minExtraSeatsNeeded) {
      const seatsToRemove = currentExtraSeats - minExtraSeatsNeeded;
      const result = await this.removeTeamSeats(organizationId, seatsToRemove);
      return { seatsReduced: result.seatsRemoved };
    }

    return null;
  }

  async addSeatsToSubscription(
    organizationId: string,
    seatsToAdd: number
  ): Promise<{ success: boolean; newSeatCount: number }> {
    const stripe = await getUncachableStripeClient();
    const org = await pgFunctions.getOrganization(organizationId);
    
    if (!org || org.subscriptionPlan !== 'team') {
      throw new Error('Only Team plan organizations can add extra seats');
    }

    if (!org.stripeSubscriptionId) {
      throw new Error('Organization does not have an active subscription');
    }

    // Get the current subscription with expanded price data
    const subscription = await stripe.subscriptions.retrieve(org.stripeSubscriptionId, {
      expand: ['items.data.price.product'],
    });
    
    // Determine if we're in live mode based on the existing subscription price
    const existingPriceId = subscription.items.data[0]?.price.id;
    const isLiveMode = existingPriceId?.includes('H5ttU72wpZ') || false;

    // Get all known seat price IDs for lookup
    const allSeatPriceIds = [
      PRICE_IDS.teamSeat.monthly,
      PRICE_IDS.teamSeat.monthlyLive,
      PRICE_IDS.teamSeat.annual,
      PRICE_IDS.teamSeat.annualLive,
    ];

    // Determine the correct seat price based on billing interval and environment
    // In live mode: seats are billed monthly ($6/mo) - only monthly price available
    // In test mode: use matching interval (monthly or annual) for testing
    let seatPriceId: string;
    if (isLiveMode) {
      // Live mode only has monthly seat pricing ($6/mo per seat)
      seatPriceId = PRICE_IDS.teamSeat.monthlyLive;
    } else {
      // Test mode: match the base plan interval for proper testing
      seatPriceId = org.billingInterval === 'annual' 
        ? PRICE_IDS.teamSeat.annual 
        : PRICE_IDS.teamSeat.monthly;
    }

    // Find existing seat item by price ID or by product name containing "seat"
    const existingSeatItem = subscription.items.data.find(item => {
      // Match by known price IDs
      if (allSeatPriceIds.includes(item.price.id)) {
        return true;
      }
      // Fallback: match by product name containing "seat" (case insensitive)
      const product = item.price.product;
      if (typeof product === 'object' && product !== null && 'name' in product) {
        const productName = (product as any).name?.toLowerCase() || '';
        return productName.includes('seat') || productName.includes('user');
      }
      return false;
    });

    const currentExtraSeats = org.extraSeats || 0;
    const newExtraSeats = currentExtraSeats + seatsToAdd;

    // Perform Stripe operation first - only update local state if it succeeds
    try {
      if (existingSeatItem) {
        // Update the quantity of existing seat item
        await stripe.subscriptionItems.update(existingSeatItem.id, {
          quantity: newExtraSeats,
          proration_behavior: 'create_prorations',
        });
      } else {
        // Add new seat item to the subscription
        await stripe.subscriptionItems.create({
          subscription: org.stripeSubscriptionId,
          price: seatPriceId,
          quantity: seatsToAdd,
          proration_behavior: 'create_prorations',
        });
      }
    } catch (stripeError: any) {
      console.error('[Billing] Stripe seat add failed:', stripeError);
      throw new Error(stripeError.message || 'Failed to add seats to subscription');
    }

    // Update organization with new seat count immediately (only after Stripe succeeds)
    await pgFunctions.updateOrganizationSubscription(organizationId, {
      extraSeats: newExtraSeats,
      pendingExtraSeats: null,
    });

    await pgFunctions.createBillingHistoryEntry({
      organizationId,
      eventType: 'seats_added',
      description: `Added ${seatsToAdd} extra seat(s) - now have ${newExtraSeats} extra seat(s)`,
      seatsBefore: currentExtraSeats,
      seatsAfter: newExtraSeats,
    });

    return { success: true, newSeatCount: newExtraSeats };
  }

  async getOrganizationBillingInfo(organizationId: string) {
    const org = await pgFunctions.getOrganization(organizationId);
    
    if (!org) {
      throw new Error('Organization not found');
    }

    const users = await pgStorage.getUsersByOrganization(organizationId);
    const billingHistory = await pgFunctions.getBillingHistoryByOrganization(organizationId);
    const planLimits = PLAN_LIMITS[org.subscriptionPlan as SubscriptionPlan];

    // Determine if the organization has an active Stripe subscription
    const hasActiveSubscription = !!(org.stripeSubscriptionId && 
      (org.subscriptionStatus === 'active' || org.subscriptionStatus === 'trialing'));

    return {
      organization: org,
      organizationId: org.id,
      organizationName: org.name,
      currentPlan: org.subscriptionPlan,
      status: org.subscriptionStatus,
      interval: org.billingInterval,
      isLegacy: org.isLegacy === 'true',
      hasActiveSubscription,
      userCount: users.length,
      maxUsers: org.maxUsers + (org.extraSeats || 0),
      extraSeats: org.extraSeats || 0,
      pendingExtraSeats: org.pendingExtraSeats ?? null,
      baseUserLimit: org.maxUsers,
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
