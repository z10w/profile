import { headers } from 'next/headers';
import Stripe from 'stripe';
import { stripe } from './config';

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

export async function verifyStripeWebhookSignature(
  body: string,
  signature: string
): Promise<Stripe.Event> {
  if (!STRIPE_WEBHOOK_SECRET) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
  }

  const event = stripe.webhooks.constructEvent(
    body,
    signature,
    STRIPE_WEBHOOK_SECRET
  );

  return event;
}

export async function getStripeWebhookEvent(request: Request): Promise<{
  event: Stripe.Event | null;
  error: string | null;
}> {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return {
        event: null,
        error: 'Missing stripe-signature header',
      };
    }

    const event = await verifyStripeWebhookSignature(body, signature);

    return {
      event,
      error: null,
    };
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return {
      event: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Simulated Webhook Event for Testing
 * 
 * This represents a checkout.session.completed event that would be sent by Stripe.
 * 
 * Example structure:
 * {
 *   "id": "evt_1234567890",
 *   "object": "event",
 *   "type": "checkout.session.completed",
 *   "data": {
 *     "object": {
 *       "id": "cs_1234567890",
 *       "object": "checkout.session",
 *       "metadata": {
 *         "userId": "user_abc123",
 *         "packId": "pack_b"
 *       },
 *       "payment_intent": "pi_1234567890",
 *       "amount_total": 1999,
 *       "currency": "usd",
 *       "status": "complete"
 *     }
 *   },
 *   "created": 1234567890
 * }
 * 
 * IMPORTANT: The payment_intent field is what we store as stripePaymentIntentId
 * in CreditTransaction for idempotency tracking.
 */
