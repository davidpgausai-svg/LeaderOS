import { getStripeSync, getUncachableStripeClient } from './stripeClient';
import { billingService } from './billingService';
import { sendWelcomeEmail } from './email';
import type Stripe from 'stripe';
import { db } from './db';
import { sql } from 'drizzle-orm';

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string, uuid: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'This usually means express.json() parsed the body before reaching this handler. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    // Get webhook secret from database for managed webhooks
    const result = await db.execute(
      sql`SELECT secret FROM "stripe"."_managed_webhooks" WHERE uuid = ${uuid}`
    );
    
    if (!result.rows || result.rows.length === 0) {
      throw new Error(`No managed webhook found with UUID: ${uuid}`);
    }
    
    const webhookSecret = result.rows[0].secret as string;
    
    // Construct the event ourselves using Stripe SDK so we can use it for custom handling
    const stripe = await getUncachableStripeClient();
    const event = await stripe.webhooks.constructEventAsync(payload, signature, webhookSecret);
    
    console.log(`[Stripe Webhook] Received event: ${event.type} (${event.id})`);
    
    // First, run our custom handlers (for account provisioning, etc.)
    await WebhookHandlers.handleStripeEvent(event);
    
    // Then, let the sync library handle data persistence (it will re-construct the event internally)
    try {
      const sync = await getStripeSync();
      await sync.processWebhook(payload, signature, uuid);
    } catch (syncError) {
      // Log sync errors but don't fail - our custom handler already ran
      console.error('[Stripe Webhook] Sync library error (continuing):', syncError);
    }
  }

  static async handleStripeEvent(event: Stripe.Event): Promise<void> {
    console.log(`[Stripe Webhook] Processing event: ${event.type}`);

    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await WebhookHandlers.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
          break;

        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          await billingService.handleSubscriptionChange(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.deleted':
          await billingService.handleSubscriptionCanceled(event.data.object as Stripe.Subscription);
          break;

        case 'invoice.payment_succeeded':
          await billingService.handlePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;

        case 'invoice.payment_failed':
          await billingService.handlePaymentFailed(event.data.object as Stripe.Invoice);
          break;

        case 'customer.subscription.trial_will_end':
          await billingService.handleTrialEnding(event.data.object as Stripe.Subscription);
          break;

        default:
          console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
      }
    } catch (error) {
      // Log but don't rethrow - acknowledge to Stripe to prevent infinite retries
      console.error(`[Stripe Webhook] Error processing ${event.type} (acknowledging to prevent retry):`, error);
    }
  }

  static async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    console.log(`[Stripe Webhook] Checkout session completed: ${session.id}`);
    
    try {
      const result = await billingService.handleCheckoutSessionCompleted(session);
      
      if (result.isNewCustomer && result.tempPassword && session.customer_details?.email) {
        // Send welcome email with temporary password
        const customerName = session.customer_details?.name?.split(' ')[0] || null;
        await sendWelcomeEmail(
          session.customer_details.email,
          result.tempPassword,
          customerName
        );
        console.log(`[Stripe Webhook] Welcome email sent to ${session.customer_details.email}`);
      }
    } catch (error) {
      // Log but don't rethrow - acknowledge to Stripe to prevent infinite retries
      console.error('[Stripe Webhook] Error handling checkout completion (acknowledging to prevent retry):', error);
    }
  }
}
