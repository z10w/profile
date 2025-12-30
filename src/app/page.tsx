'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { LoginForm } from '@/components/auth/LoginForm';
import { SignupForm } from '@/components/auth/SignupForm';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import { useRouter, useSearchParams } from 'next/navigation';

type AuthView = 'login' | 'signup' | 'forgot-password';

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [authView, setAuthView] = useState<AuthView>('login');

  // Handle email verification
  const verifyToken = searchParams.get('token');
  if (verifyToken) {
    // Handle verification on the server side or show a verification page
    router.push(`/verify-email?token=${verifyToken}`);
    return null;
  }

  // Handle password reset
  const resetToken = searchParams.get('resetToken');
  if (resetToken) {
    router.push(`/reset-password?token=${resetToken}`);
    return null;
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to dashboard if authenticated
  if (isAuthenticated) {
    router.push('/dashboard');
    return null;
  }

  // Render auth forms
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">ForgeLang</h1>
          <p className="text-muted-foreground">
            Master languages through AI-powered exams
          </p>
        </div>

        {authView === 'login' && (
          <LoginForm
            onSuccess={() => router.push('/dashboard')}
            onSwitchToSignup={() => setAuthView('signup')}
            onSwitchToForgotPassword={() => setAuthView('forgot-password')}
          />
        )}

        {authView === 'signup' && (
          <SignupForm
            onSuccess={() => setAuthView('login')}
            onSwitchToLogin={() => setAuthView('login')}
          />
        )}

        {authView === 'forgot-password' && (
          <ForgotPasswordForm
            onSuccess={() => setAuthView('login')}
            onSwitchToLogin={() => setAuthView('login')}
          />
        )}
      </div>
    </div>
  );
}
