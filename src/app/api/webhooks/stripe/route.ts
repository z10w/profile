import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getStripeWebhookEvent } from '@/lib/stripe/webhooks';
import { getCreditPackById } from '@/lib/stripe/config';
import Stripe from 'stripe';

/**
 * Stripe Webhook Handler
 * 
 * CRITICAL: This handler implements idempotency to prevent duplicate credit allocations.
 * 
 * Security: Verifies Stripe signature
 * Idempotency: Checks if stripePaymentIntentId already exists in CreditTransaction
 * If yes: Returns 200 OK immediately (duplicate event)
 * If no: Processes payment and allocates credits
 */
export async function POST(request: NextRequest) {
  try {
    // Verify Stripe signature and get event
    const { event, error } = await getStripeWebhookEvent(request);

    if (error) {
      console.error('Webhook verification error:', error);
      return NextResponse.json(
        { error: 'Webhook verification failed' },
        { status: 400 }
      );
    }

    if (!event) {
      return NextResponse.json(
        { error: 'No event received' },
        { status: 400 }
      );
    }

    console.log(`Received Stripe webhook: ${event.type}`);

    // Handle checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      await handleCheckoutSessionCompleted(session, event.id);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Handle checkout.session.completed event
 * 
 * CRITICAL: Implements idempotency by checking if payment_intent already exists
 */
async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
  eventId: string
) {
  console.log('Processing checkout.session.completed:', session.id);

  // Validate metadata
  const userId = session.metadata?.userId;
  const packId = session.metadata?.packId;
  const paymentIntentId = session.payment_intent as string;

  if (!userId || !packId || !paymentIntentId) {
    console.error('Invalid metadata in session:', session.id);
    return;
  }

  // IDEMPOTENCY CHECK: Check if this payment has already been processed
  const existingTransaction = await db.creditTransaction.findUnique({
    where: { stripePaymentIntentId: paymentIntentId },
  });

  if (existingTransaction) {
    console.log(`Payment ${paymentIntentId} already processed. Returning early (idempotency).`);
    return;
  }

  // Get credit pack details
  const creditPack = getCreditPackById(packId);

  if (!creditPack) {
    console.error(`Invalid packId: ${packId}`);
    return;
  }

  console.log(`Allocating ${creditPack.credits} credits to user ${userId}`);

  // Use a transaction to ensure atomicity
  await db.$transaction(async (tx) => {
    // Add credits to user
    await tx.user.update({
      where: { id: userId },
      data: {
        credits: {
          increment: creditPack.credits,
        },
      },
    });

    // Create credit transaction
    await tx.creditTransaction.create({
      data: {
        userId,
        amount: creditPack.credits,
        type: 'PURCHASE',
        stripePaymentIntentId: paymentIntentId,
        reason: `Purchased ${creditPack.name}`,
      },
    });
  });

  // Simulate sending confirmation email
  console.log('=== PAYMENT CONFIRMATION EMAIL ===');
  console.log(`Event ID: ${eventId}`);
  console.log(`Payment Intent ID: ${paymentIntentId}`);
  console.log(`User ID: ${userId}`);
  console.log(`Pack: ${creditPack.name} (${creditPack.credits} credits)`);
  console.log(`Amount: $${creditPack.price}`);
  console.log('===================================');
}

/**
 * Simulated Webhook Event for Testing
 * 
 * This represents a checkout.session.completed event that would be sent by Stripe.
 * 
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
 * IMPORTANT:
 * - payment_intent (pi_1234567890) is stored as stripePaymentIntentId
 * - We check this field for idempotency to prevent double-crediting
 * - If stripePaymentIntentId already exists, we return 200 OK immediately
 */
