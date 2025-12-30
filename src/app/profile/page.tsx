'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';

export default function ProfilePage() {
  const { user } = useAuth();

  return (
    <DashboardLayout>
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground">
          Manage your account settings and view your profile information
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Your account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Name</p>
              <p className="text-lg">{user?.name || 'Not set'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Email</p>
              <p className="text-lg">{user?.email}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Role</p>
              <p className="text-lg">{user?.role}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Learning Progress</CardTitle>
            <CardDescription>Your current proficiency</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">CEFR Level</p>
              <p className="text-lg">{user?.levelEstimate || 'Not assessed'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Credits</p>
              <p className="text-lg">{user?.credits || 0}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Email Verified</p>
              <p className="text-lg">{user?.isEmailVerified ? 'Yes' : 'No'}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>Additional profile features</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Profile editing, avatar upload, and advanced settings will be available in future updates.
          </p>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
