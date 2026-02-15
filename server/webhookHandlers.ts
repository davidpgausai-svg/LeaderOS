import { getUncachableStripeClient } from './stripeClient';
import { billingService } from './billingService';
import { sendWelcomeEmail } from './email';
import type Stripe from 'stripe';
import { db } from './db';
import { eq } from 'drizzle-orm';
import { processedStripeEvents } from '@shared/schema';

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string, _uuid: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'This usually means express.json() parsed the body before reaching this handler. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET environment variable is not set');
    }
    
    const stripe = await getUncachableStripeClient();
    const event = await stripe.webhooks.constructEventAsync(payload, signature, webhookSecret);
    
    console.log(`[Stripe Webhook] Received event: ${event.type} (${event.id})`);
    
    await WebhookHandlers.handleStripeEvent(event);
  }

  static async handleStripeEvent(event: Stripe.Event): Promise<void> {
    console.log(`[Stripe Webhook] Processing event: ${event.type}`);

    // Check if this event has already been processed (idempotency check)
    const existingEvent = await db.select()
      .from(processedStripeEvents)
      .where(eq(processedStripeEvents.eventId, event.id))
      .limit(1);
    
    if (existingEvent.length > 0) {
      console.log(`[Stripe Webhook] Event ${event.id} already processed, skipping`);
      return;
    }

    // Mark event as processed BEFORE handling to prevent race conditions
    try {
      await db.insert(processedStripeEvents).values({
        eventId: event.id,
        eventType: event.type,
      }).onConflictDoNothing();
    } catch (insertError) {
      // If insert fails due to race condition, another instance is processing - skip
      console.log(`[Stripe Webhook] Event ${event.id} being processed by another instance, skipping`);
      return;
    }

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
