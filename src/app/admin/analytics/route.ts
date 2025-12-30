import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAccessToken } from '@/lib/auth';
import { verifyAdminAccess, unauthorizedResponse } from '@/lib/auth/admin';

/**
 * Get Admin Analytics
 * 
 * Returns:
 * - Conversion Rate: (Purchases / Visitors)
 * - Completion Rate: (Completed Exams / Started Exams)
 * - Revenue: Sum of CreditTransaction where type=PURCHASE
 * - Average Scores: Avg score per Exam Type
 * - AI Cost: Sum of aiCost from ExamHistory
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const admin = await verifyAdminAccess(request);
    if (!admin) {
      return unauthorizedResponse();
    }

    // Get analytics data
    const [
      totalUsers,
      totalExamsStarted,
      totalExamsCompleted,
      totalPurchases,
      totalRevenue,
      avgReadingScore,
      avgListeningScore,
      avgWritingScore,
      avgSpeakingScore,
      totalAICost,
      examScoresByType,
      revenueByMonth,
    ] = await Promise.all([
      db.user.count(),
      db.examHistory.count({ where: { status: 'IN_PROGRESS' } }),
      db.examHistory.count({ where: { status: 'COMPLETED' } }),
      db.creditTransaction.count({ where: { type: 'PURCHASE' } }),
      db.creditTransaction.aggregate({
        _sum: { amount: true },
        where: { type: 'PURCHASE' },
      }),
      // Average scores by exam type
      db.examHistory.aggregate({
        where: {
          status: 'COMPLETED',
          examType: 'READING',
          score: { not: null },
        },
        _avg: { score: true },
      }),
      db.examHistory.aggregate({
        where: {
          status: 'COMPLETED',
          examType: 'LISTENING',
          score: { not: null },
        },
        _avg: { score: true },
      }),
      db.examHistory.aggregate({
        where: {
          status: 'COMPLETED',
          examType: 'WRITING',
          score: { not: null },
        },
        _avg: { score: true },
      }),
      db.examHistory.aggregate({
        where: {
          status: 'COMPLETED',
          examType: 'SPEAKING',
          score: { not: null },
        },
        _avg: { score: true },
      }),
      // Total AI cost
      db.examHistory.aggregate({
        where: {
          status: 'COMPLETED',
          aiCost: { not: null },
        },
        _sum: { aiCost: true },
      }),
      // Exam scores breakdown by type
      db.$transaction(async (tx) => {
        const readingScores = await tx.examHistory.findMany({
          where: {
            status: 'COMPLETED',
            examType: 'READING',
            score: { not: null },
          },
          select: { score: true },
          orderBy: { createdAt: 'desc' },
          take: 30,
        });

        const listeningScores = await tx.examHistory.findMany({
          where: {
            status: 'COMPLETED',
            examType: 'LISTENING',
            score: { not: null },
          },
          select: { score: true },
          orderBy: { createdAt: 'desc' },
          take: 30,
        });

        const writingScores = await tx.examHistory.findMany({
          where: {
            status: 'COMPLETED',
            examType: 'WRITING',
            score: { not: null },
          },
          select: { score: true },
          orderBy: { createdAt: 'desc' },
          take: 30,
        });

        const speakingScores = await tx.examHistory.findMany({
          where: {
            status: 'COMPLETED',
            examType: 'SPEAKING',
            score: { not: null },
          },
          select: { score: true },
          orderBy: { createdAt: 'desc' },
          take: 30,
        });

        return {
          reading: readingScores.map((e: any) => e.score),
          listening: listeningScores.map((e: any) => e.score),
          writing: writingScores.map((e: any) => e.score),
          speaking: speakingScores.map((e: any) => e.score),
        };
      }),
      // Revenue by month (last 6 months)
      db.creditTransaction.aggregate({
        where: {
          type: 'PURCHASE',
          createdAt: {
            gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000), // 6 months ago
          },
        },
        _sum: { amount: true },
      }),
    ]);

    const totalVisitors = 1500; // Estimated (would come from analytics service)
    const conversionRate = totalPurchases / totalVisitors;
    const completionRate = totalExamsStarted > 0 ? (totalExamsCompleted / totalExamsStarted) * 100 : 0;

    const analytics = {
      users: {
        total: totalUsers,
      },
      exams: {
        totalStarted: totalExamsStarted,
        totalCompleted: totalExamsCompleted,
        completionRate: completionRate.toFixed(2),
        averageScores: {
          reading: avgReadingScore?._avg.score?.toFixed(1) || 0,
          listening: avgListeningScore?._avg.score?.toFixed(1) || 0,
          writing: avgWritingScore?._avg.score?.toFixed(1) || 0,
          speaking: avgSpeakingScore?._avg.score?.toFixed(1) || 0,
        },
        scoresByType: examScoresByType,
      },
      revenue: {
        totalPurchases,
        totalRevenue: totalRevenue._sum.amount || 0,
      },
      costs: {
        totalAICost: totalAICost._sum.aiCost || 0,
        avgCostPerExam: totalAICost._sum.aiCost ? (totalAICost._sum.aiCost / totalExamsCompleted).toFixed(4) : 0,
      },
    };

    console.log('=== ADMIN ANALYTICS ===');
    console.log(`Total Users: ${totalUsers}`);
    console.log(`Total Revenue: $${analytics.revenue.totalRevenue.toFixed(2)}`);
    console.log(`Total AI Cost: $${analytics.costs.totalAICost.toFixed(2)}`);
    console.log('=========================');

    return NextResponse.json({ analytics });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
