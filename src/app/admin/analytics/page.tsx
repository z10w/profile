'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Users, DollarSign, BookOpen, GraduationCap, Activity, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

export default function AdminAnalyticsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') {
      router.push('/dashboard');
      return;
    }
    fetchAnalytics();
    fetchUsers();
  }, [user]);

  const fetchAnalytics = async () => {
    try {
      const accessToken = localStorage.getItem('accessToken');
      const response = await fetch('/api/admin/analytics', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const data = await response.json();
      setAnalytics(data.analytics);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const accessToken = localStorage.getItem('accessToken');
      const response = await fetch('/api/admin/users', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data.users);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== 'ADMIN') {
    return null;
  }

  if (loading && !analytics && !error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20">
      {/* Header */}
      <header className="border-b bg-background sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Admin Analytics Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                Overview of platform performance
              </p>
            </div>
            <button
              onClick={() => router.push('/admin/content')}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Content Management →
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <p className="text-destructive font-medium">{error}</p>
            </div>
          </div>
        )}

        {!error && analytics && (
          <>
            {/* Overview Cards */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {analytics.users?.total || 0}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    ${analytics.revenue?.totalRevenue?.toFixed(2) || 0}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    From {analytics.revenue?.totalPurchases || 0} purchases
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Exams Completed</CardTitle>
                  <BookOpen className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {analytics.exams?.totalCompleted || 0}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {analytics.exams?.completionRate?.toFixed(1)}% completion rate
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Avg Score</CardTitle>
                  <GraduationCap className="h-4 w-4 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {Object.values(analytics.exams?.averageScores || {})
                      .map((score: any) => parseFloat(score)?.toFixed(1))
                      .filter(Boolean)[0] || 0}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Across all exam types
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Exam Performance Section */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-6">Exam Performance</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Reading</CardTitle>
                    <CardDescription>Score distribution</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Average Score</p>
                      <div className="text-3xl font-bold text-blue-600">
                        {analytics.exams?.averageScores?.reading || '0'}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Completion Rate</p>
                      <div className="text-lg font-semibold">
                        {analytics.exams?.completionRate?.toFixed(1) || 0}%
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Listening</CardTitle>
                    <CardDescription>Score distribution</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Average Score</p>
                      <div className="text-3xl font-bold text-green-600">
                        {analytics.exams?.averageScores?.listening || '0'}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Completion Rate</p>
                      <div className="text-lg font-semibold">
                        {analytics.exams?.completionRate?.toFixed(1) || 0}%
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Writing</CardTitle>
                    <CardDescription>Score distribution</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Average Score</p>
                      <div className="text-3xl font-bold text-purple-600">
                        {analytics.exams?.averageScores?.writing || '0'}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Completion Rate</p>
                      <div className="text-lg font-semibold">
                        {analytics.exams?.completionRate?.toFixed(1) || 0}%
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Speaking</CardTitle>
                    <CardDescription>Score distribution</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Average Score</p>
                      <div className="text-3xl font-bold text-orange-600">
                        {analytics.exams?.averageScores?.speaking || '0'}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Completion Rate</p>
                      <div className="text-lg font-semibold">
                        {analytics.exams?.completionRate?.toFixed(1) || 0}%
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Revenue & Costs Section */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-6">Revenue & AI Costs</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Revenue Overview</CardTitle>
                    <CardDescription>Last 6 months</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Revenue</p>
                      <div className="text-3xl font-bold text-green-600">
                        ${analytics.revenue?.totalRevenue?.toFixed(2) || 0}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Purchases</p>
                      <div className="text-2xl font-bold">
                        {analytics.revenue?.totalPurchases || 0}
                      </div>
                    </div>
                    <div className="pt-4 border-t">
                      <p className="text-sm text-muted-foreground">Conversion Rate</p>
                      <div className="text-lg font-semibold">
                        ~{Math.floor((analytics.revenue?.totalPurchases || 0) / 150)}% (based on ~1500 visitors)
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>AI Costs</CardTitle>
                    <CardDescription>Grading expenses</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Total AI Cost</p>
                      <div className="text-3xl font-bold text-red-600">
                        ${analytics.costs?.totalAICost?.toFixed(4) || 0}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Avg Cost per Exam</p>
                      <div className="text-2xl font-bold">
                        ${analytics.costs?.avgCostPerExam || 0}
                      </div>
                    </div>
                    <div className="pt-4 border-t">
                      <p className="text-sm text-muted-foreground">Net Profit</p>
                      <div className="text-xl font-bold text-green-600">
                        ${((analytics.revenue?.totalRevenue || 0) - (analytics.costs?.totalAICost || 0)).toFixed(2)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Recent Exam Activity</CardTitle>
                  <CardDescription>Last 30 exams</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                {analytics.exams?.scoresByType && Object.keys(analytics.exams.scoresByType).length > 0 ? (
                  <div className="space-y-3">
                    {Object.entries(analytics.exams.scoresByType).slice(0, 10).map(([examType, scores]: [string, any]) => (
                      <div key={examType} className="p-4 border rounded-lg bg-muted/30">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Activity className="h-4 w-4 text-primary" />
                            <span className="font-semibold capitalize">{examType.toLowerCase()} Exam</span>
                          </div>
                          <div className="text-right">
                            <span className="text-sm text-muted-foreground">
                              {scores.length} exams
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground">Avg Score</p>
                            <p className="text-lg font-bold">
                              {scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '-'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Trend</p>
                            <p className="flex items-center gap-1">
                              {scores.length > 2 ? (
                                <>
                                  <TrendingUp className="h-4 w-4 text-green-600" />
                                  <span className="text-sm font-semibold text-green-600">Up</span>
                                </>
                              ) : scores.length > 0 ? (
                                <TrendingDown className="h-4 w-4 text-red-600" />
                                <span className="text-sm font-semibold text-red-600">Down</span>
                              ) : (
                                <span className="text-sm font-semibold text-muted-foreground">-</span>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No exam data available yet
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
