import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAccessToken } from '@/lib/auth';
import { stripe } from '@/lib/stripe/config';

/**
 * Admin-only refund endpoint
 * 
 * Requires:
 * - Valid access token
 * - User role must be ADMIN
 * 
 * Process:
 * 1. Verify transaction exists
 * 2. Verify it's a PURCHASE type
 * 3. Create Stripe refund
 * 4. Update CreditTransaction type to REFUND
 * 5. Deduct credits from user
 * 6. Log admin action (audit trail)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { transactionId: string } }
) {
  try {
    // Get access token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    const accessToken = authHeader.substring(7);

    // Verify token
    const payload = await verifyAccessToken(accessToken);

    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired access token' },
        { status: 401 }
      );
    }

    // RBAC: Check if user is ADMIN
    const adminUser = await db.user.findUnique({
      where: { id: payload.userId },
    });

    if (!adminUser || adminUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const { transactionId } = params;

    if (!transactionId) {
      return NextResponse.json(
        { error: 'Transaction ID is required' },
        { status: 400 }
      );
    }

    // Get transaction
    const transaction = await db.creditTransaction.findUnique({
      where: { id: transactionId },
      include: { user: true },
    });

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    // Verify transaction is a PURCHASE type
    if (transaction.type !== 'PURCHASE') {
      return NextResponse.json(
        { error: 'Only PURCHASE transactions can be refunded' },
        { status: 400 }
      );
    }

    // Verify transaction has a stripePaymentIntentId
    if (!transaction.stripePaymentIntentId) {
      return NextResponse.json(
        { error: 'Transaction does not have a valid Stripe payment intent' },
        { status: 400 }
      );
    }

    // Check if already refunded
    const existingRefund = await db.creditTransaction.findFirst({
      where: {
        stripePaymentIntentId: transaction.stripePaymentIntentId,
        type: 'REFUND',
      },
    });

    if (existingRefund) {
      return NextResponse.json(
        { error: 'Transaction has already been refunded' },
        { status: 400 }
      );
    }

    console.log(`Admin ${adminUser.email} initiating refund for transaction ${transactionId}`);

    // Create Stripe refund
    let refund;
    try {
      refund = await stripe.refunds.create({
        payment_intent: transaction.stripePaymentIntentId,
      });
    } catch (stripeError) {
      console.error('Stripe refund error:', stripeError);
      return NextResponse.json(
        { error: 'Failed to process Stripe refund' },
        { status: 500 }
      );
    }

    // Use transaction to ensure atomicity
    await db.$transaction(async (tx) => {
      // Deduct credits from user
      await tx.user.update({
        where: { id: transaction.userId },
        data: {
          credits: {
            decrement: transaction.amount,
          },
        },
      });

      // Update original transaction reason to indicate refund
      await tx.creditTransaction.update({
        where: { id: transaction.id },
        data: {
          reason: `${transaction.reason} - REFUNDED`,
        },
      });

      // Create refund transaction
      await tx.creditTransaction.create({
        data: {
          userId: transaction.userId,
          amount: -transaction.amount, // Negative amount for refund
          type: 'REFUND',
          stripePaymentIntentId: transaction.stripePaymentIntentId,
          reason: `Refund of ${transaction.reason}. Refund ID: ${refund.id}`,
        },
      });
    });

    // Audit log (simulated - in production, create a dedicated AuditLog model)
    console.log('=== ADMIN ACTION LOG ===');
    console.log(`Admin ID: ${adminUser.id}`);
    console.log(`Admin Email: ${adminUser.email}`);
    console.log(`Action: REFUND`);
    console.log(`Target User ID: ${transaction.userId}`);
    console.log(`Target User Email: ${transaction.user.email}`);
    console.log(`Transaction ID: ${transactionId}`);
    console.log(`Amount: ${transaction.amount} credits`);
    console.log(`Stripe Refund ID: ${refund.id}`);
    console.log('========================');

    return NextResponse.json({
      message: 'Refund processed successfully',
      refundId: refund.id,
      transactionId,
      creditsRefunded: transaction.amount,
      userId: transaction.userId,
    });
  } catch (error) {
    console.error('Refund error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
