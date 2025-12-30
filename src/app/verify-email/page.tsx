'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';

export default function VerifyEmailPage() {
  const { verifyEmail, isAuthenticated } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setError('Invalid verification link');
      setIsLoading(false);
      return;
    }

    verifyEmailAddress(token);
  }, [token]);

  const verifyEmailAddress = async (verificationToken: string) => {
    try {
      await verifyEmail(verificationToken);
      setSuccess(true);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Email verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Redirect if already authenticated
  if (isAuthenticated) {
    router.push('/dashboard');
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">ForgeLang</h1>
          <p className="text-muted-foreground">Email Verification</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Email Verification</CardTitle>
            <CardDescription>
              {isLoading ? 'Verifying your email address...' : 'Verification result'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-sm text-muted-foreground">Verifying email...</p>
              </div>
            ) : success ? (
              <div className="space-y-4">
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Your email has been verified successfully! You can now log in to your account.
                  </AlertDescription>
                </Alert>
                <Button onClick={() => router.push('/')} className="w-full">
                  Go to Login
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    {error || 'Email verification failed. The link may be expired or invalid.'}
                  </AlertDescription>
                </Alert>
                <Button onClick={() => router.push('/')} className="w-full">
                  Back to Login
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  Need a new verification link?{' '}
                  <Link href="/" className="underline">
                    Sign up again
                  </Link>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
