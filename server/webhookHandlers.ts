import { getStripeSync } from './stripeClient';
import { billingService } from './billingService';
import type Stripe from 'stripe';

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

    const sync = await getStripeSync();
    
    const event = await sync.processWebhook(payload, signature, uuid) as Stripe.Event;
    
    if (event) {
      await WebhookHandlers.handleStripeEvent(event);
    }
  }

  static async handleStripeEvent(event: Stripe.Event): Promise<void> {
    console.log(`[Stripe Webhook] Processing event: ${event.type}`);

    try {
      switch (event.type) {
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
      console.error(`[Stripe Webhook] Error processing ${event.type}:`, error);
      throw error;
    }
  }
}
