'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ExamsPage() {
  return (
    <DashboardLayout>
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Exams</h1>
        <p className="text-muted-foreground">
          Take AI-powered exams to test and improve your language skills
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>
            Exam features will be available in the next phase
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            You'll be able to take Reading, Listening, Writing, and Speaking exams here.
          </p>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
