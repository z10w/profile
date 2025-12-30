'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { User, CreditTransaction, ExamHistory } from '@/lib/prisma';
import { Search, Users, DollarSign, History, Loader2, CheckCircle2, XCircle, Plus, Minus, Eye, AlertCircle } from 'lucide-react';

export default function AdminUsersPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchEmail, setSearchEmail] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [grantAmount, setGrantAmount] = useState('');
  const [revokeAmount, setRevokeAmount] = useState('');
  const [grantReason, setGrantReason] = useState('');
  const [revokeReason, setRevokeReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') {
      router.push('/dashboard');
      return;
    }
    fetchUsers();
  }, [user]);

  const fetchUsers = async (email?: string) => {
    setLoading(true);
    try {
      const accessToken = localStorage.getItem('accessToken');
      const url = `/api/admin/users${email ? `?email=${encodeURIComponent(email)}` : ''}`;
      
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data.users || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleGrantCredits = async () => {
    if (!selectedUser || !grantAmount || !grantReason.trim()) return;

    setIsProcessing(true);
    try {
      const accessToken = localStorage.getItem('accessToken');
      const response = await fetch('/api/admin/users/grant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          userId: selectedUser.id,
          amount: parseInt(grantAmount),
          reason: grantReason,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to grant credits');
      }

      toast({
        title: 'Credits Granted',
        description: `Successfully granted ${grantAmount} credits to ${selectedUser.email}`,
      });

      // Refresh user list
      await fetchUsers(searchEmail);
      setShowGrantModal(false);
      setGrantAmount('');
      setGrantReason('');
      setSelectedUser(null);
    } catch (err) {
      console.error('Error granting credits:', err);
      setError(err instanceof Error ? err.message : 'Failed to grant credits');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRevokeCredits = async () => {
    if (!selectedUser || !revokeAmount || !revokeReason.trim()) return;

    setIsProcessing(true);
    try {
      const accessToken = localStorage.getItem('accessToken');
      const response = await fetch('/api/admin/users/revoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          userId: selectedUser.id,
          amount: parseInt(revokeAmount),
          reason: revokeReason,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to revoke credits');
      }

      toast({
        title: 'Credits Revoked',
        description: `Successfully revoked ${revokeAmount} credits from ${selectedUser.email}`,
      });

      await fetchUsers(searchEmail);
      setShowRevokeModal(false);
      setRevokeAmount('');
      setRevokeReason('');
      setSelectedUser(null);
    } catch (err) {
      console.error('Error revoking credits:', err);
      setError(err instanceof Error ? err.message : 'Failed to revoke credits');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleAccount = async (disabled: boolean) => {
    if (!selectedUser) return;

    setIsProcessing(true);
    try {
      const accessToken = localStorage.getItem('accessToken');
      const response = await fetch('/api/admin/users/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          userId: selectedUser.id,
          disabled,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to toggle account');
      }

      toast({
        title: disabled ? 'Account Disabled' : 'Account Enabled',
        description: `Account for ${selectedUser.email} has been ${disabled ? 'disabled' : 'enabled'}`,
      });

      await fetchUsers(searchEmail);
      setShowDisableModal(false);
      setSelectedUser(null);
    } catch (err) {
      console.error('Error toggling account:', err);
      setError(err instanceof Error ? err.message : 'Failed to toggle account');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleViewExamHistory = async (userId: string) => {
    try {
      const accessToken = localStorage.getItem('accessToken');
      const response = await fetch(`/api/admin/users/${userId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user details');
      }

      const data = await response.json();
      setSelectedUser(data.user);
    } catch (err) {
      console.error('Error fetching user details:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchEmail.toLowerCase())
  );

  if (!user || user.role !== 'ADMIN') {
    return null;
  }

  return (
    <div className="min-h-screen bg-muted/20">
      {/* Header */}
      <header className="border-b bg-background sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">User Management</h1>
              <p className="text-sm text-muted-foreground">
                Manage user accounts, credits, and permissions
              </p>
            </div>
            <button
              onClick={() => router.push('/admin/analytics')}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Analytics →
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Search Bar */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="Search users by email..."
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                onClick={() => router.push('/admin/content/users/new')}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                New User
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Users List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-center mt-4">Loading users...</p>
          </div>
        ) : error ? (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <p className="destructive font-medium">{error}</p>
            </div>
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>
                All Users ({filteredUsers.length})
              </CardTitle>
              <CardDescription>
                Search, view history, grant/revoke credits, manage accounts
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredUsers.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">No users found</p>
                  <p className="text-sm">Try adjusting your search</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer bg-background"
                      onClick={() => setSelectedUser(user)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                            {user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold">{user.name || user.email}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={user.role === 'ADMIN' ? 'default' : 'outline'}>
                            {user.role}
                          </Badge>
                          {user.isEmailVerified ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-4 pt-4 border-t">
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground mb-1">Credits</p>
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4 text-green-600" />
                            <p className="text-lg font-bold">{user.credits}</p>
                          </div>
                        </div>

                        <div className="text-center">
                          <p className="text-xs text-muted-foreground mb-1">Exams</p>
                          <p className="text-lg font-bold">
                            {user._count?.examHistories || 0}
                          </p>
                        </div>

                        <div className="text-center">
                          <p className="text-xs text-muted-foreground mb-1">Level</p>
                          <p className="text-lg font-bold">
                            {user.levelEstimate || 'N/A'}
                          </p>
                        </div>

                        <div className="text-center">
                          <p className="text-xs text-muted-foreground mb-1">Joined</p>
                          <p className="text-sm font-medium">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-4 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewExamHistory(user.id)}
                          className="flex-1"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View History
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => setShowGrantModal(true)}
                          className="flex-1"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Grant
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setShowRevokeModal(true)}
                          className="flex-1"
                        >
                          <Minus className="h-4 w-4 mr-2" />
                          Revoke
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>

      {/* Grant Credits Modal */}
      {showGrantModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-xl font-bold">Grant Credits</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedUser.name || selectedUser.email}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowGrantModal(false)}
              >
                ×
              </Button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium mb-2">Amount</label>
                <Input
                  type="number"
                  min="1"
                  max="1000"
                  value={grantAmount}
                  onChange={(e) => setGrantAmount(e.target.value)}
                  placeholder="Enter amount (1-1000)"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2">Reason</label>
                <Input
                  type="text"
                  value={grantReason}
                  onChange={(e) => setGrantReason(e.target.value)}
                  placeholder="Reason for granting credits"
                />
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowGrantModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleGrantCredits}
                  disabled={isProcessing || !grantAmount || !grantReason.trim()}
                  className="flex-1"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Granting...
                    </>
                  ) : (
                    'Grant Credits'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Revoke Credits Modal */}
      {showRevokeModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-xl font-bold">Revoke Credits</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedUser.name || selectedUser.email}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowRevokeModal(false)}
              >
                ×
              </Button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium mb-2">Amount to Revoke</label>
                <Input
                  type="number"
                  min="1"
                  max={selectedUser.credits}
                  value={revokeAmount}
                  onChange={(e) => setRevokeAmount(e.target.value)}
                  placeholder={`Max: ${selectedUser.credits}`}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2">Reason</label>
                <Input
                  type="text"
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                  placeholder="Reason for revoking credits"
                />
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowRevokeModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleRevokeCredits}
                  disabled={isProcessing || !revokeAmount || !revokeReason.trim()}
                  variant="destructive"
                  className="flex-1"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Revoking...
                    </>
                  ) : (
                    'Revoke Credits'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Exam History Modal */}
      {selectedUser && !showGrantModal && !showRevokeModal && !showDisableModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg shadow-xl max-w-4xl w-full h-[80vh]">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-xl font-bold">User History</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedUser.name || selectedUser.email}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedUser(null)}
              >
                ×
              </Button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <History className="h-5 w-5 text-blue-600" />
                  Exam History (Last 20)
                </h3>
                {selectedUser.examHistories && selectedUser.examHistories.length > 0 ? (
                  <div className="space-y-3">
                    {selectedUser.examHistories.map((exam: any) => (
                      <Card key={exam.id} className="hover:shadow-md">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="outline">{exam.examType}</Badge>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">
                                {new Date(exam.createdAt).toLocaleDateString()}
                              </span>
                              {exam.status === 'COMPLETED' && exam.score && (
                                <span className="font-bold text-lg">
                                  {exam.score.toFixed(1)}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="mt-2 text-sm">
                            <p className="text-muted-foreground mb-1">
                              Status: <span className={`font-medium ${
                                exam.status === 'COMPLETED' ? 'text-green-600' :
                                exam.status === 'IN_PROGRESS' ? 'text-blue-600' :
                                'text-red-600'
                              }`}>{exam.status}</span>
                            </p>
                            {exam.subScores && (
                              <p className="text-muted-foreground">
                                Duration: {Math.floor((exam.subScores?.timeSpent || 0) / 60)}m {((exam.subScores?.timeSpent || 0) % 60).toString().padStart(2, '0')}s
                              </p>
                            )}
                            {exam.aiCost && (
                              <p className="text-muted-foreground">
                                AI Cost: ${exam.aiCost.toFixed(4)}
                              </p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <p className="text-lg">No exam history</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
