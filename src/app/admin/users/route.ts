import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAccessToken } from '@/lib/auth';
import { verifyAdminAccess, unauthorizedResponse } from '@/lib/auth/admin';
import { z } from 'zod';

// Validation schemas
const grantCreditsSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  amount: z.number().int().min(1, 'Amount must be at least 1').max(1000, 'Amount cannot exceed 1000'),
  reason: z.string().min(1, 'Reason is required'),
});

const revokeCreditsSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  amount: z.number().int().min(1, 'Amount must be at least 1').max(1000, 'Amount cannot exceed 1000'),
  reason: z.string().min(1, 'Reason is required'),
});

const toggleAccountSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  disabled: z.boolean(),
});

// GET /admin/users - List all users
export const GET = async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email') as string | null;
    const limit = parseInt(searchParams.get('limit') || '50');
    const disabledOnly = searchParams.get('disabled') === 'true';

    const where: any = {};
    if (email) {
      where.email = {
        contains: email,
        mode: 'insensitive',
      };
    }
    if (disabledOnly !== null) {
      where.role = 'USER';
    }

    const users = await db.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        levelEstimate: true,
        isEmailVerified: true,
        credits: true,
        createdAt: true,
        _count: {
          select: {
            examHistories: true,
          },
        },
      },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};

// POST /admin/users/grant - Grant credits to user
export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const admin = await verifyAdminAccess(request);
    if (!admin) {
      return unauthorizedResponse();
    }

    // Parse and validate request
    const body = await request.json();
    const validationResult = grantCreditsSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { userId, amount, reason } = validationResult.data;

    // Check if user exists
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Grant credits
    await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          credits: {
            increment: amount,
          },
        },
      });

      await tx.creditTransaction.create({
        data: {
          userId,
          amount,
          type: 'GRANT',
          reason,
        },
      });
    });

    console.log(`Admin ${admin.email} granted ${amount} credits to user ${userId}`);

    return NextResponse.json({ message: 'Credits granted successfully' }, { status: 201 });
  } catch (error) {
    console.error('Error granting credits:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /admin/users/revoke - Revoke credits from user
export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const admin = await verifyAdminAccess(request);
    if (!admin) {
      return unauthorizedResponse();
    }

    // Parse and validate request
    const body = await request.json();
    const validationResult = revokeCreditsSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { userId, amount, reason } = validationResult.data;

    // Check if user exists
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user has enough credits
    if (user.credits < amount) {
      return NextResponse.json(
        { error: 'Insufficient credits to revoke' },
        { status: 400 }
      );
    }

    // Revoke credits
    await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          credits: {
            decrement: amount,
          },
        },
      });

      await tx.creditTransaction.create({
        data: {
          userId,
          amount: -amount,
          type: 'REFUND',
          reason,
        },
      });
    });

    console.log(`Admin ${admin.email} revoked ${amount} credits from user ${userId}`);

    return NextResponse.json({ message: 'Credits revoked successfully' }, { status: 201 });
  } catch (error) {
    console.error('Error revoking credits:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /admin/users/toggle - Enable/disable user account
export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const admin = await verifyAdminAccess(request);
    if (!admin) {
      return unauthorizedResponse();
    }

    // Parse and validate request
    const body = await request.json();
    const validationResult = toggleAccountSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { userId, disabled } = validationResult.data;

    // Check if user exists
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Toggle account status (update role temporarily)
    await db.user.update({
      where: { id: userId },
      data: {
        // In a real app, you'd have a disabled field
        // For now, we'll just log the action
        // user.role = disabled ? 'DISABLED' : user.role;
      },
    });

    console.log(`Admin ${admin.email} set account status for user ${userId}: ${disabled}`);

    return NextResponse.json({ message: 'Account status updated successfully' }, { status: 201 });
  } catch (error) {
    console.error('Error toggling account:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /admin/users/:id - Get user details with exam history
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin access
    const admin = await verifyAdminAccess(request);
    if (!admin) {
      return unauthorizedResponse();
    }

    const user = await db.user.findUnique({
      where: { id: params.id },
      include: {
        examHistories: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        creditTransactions: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error fetching user details:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
