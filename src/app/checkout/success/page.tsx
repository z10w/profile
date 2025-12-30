'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Loader2 } from 'lucide-react';

export default function CheckoutSuccessPage() {
  const { refreshTokens } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creditsAdded, setCreditsAdded] = useState<number | null>(null);

  useEffect(() => {
    const handleSuccess = async () => {
      const sessionId = searchParams.get('session_id');

      if (!sessionId) {
        setError('No session ID found');
        setIsLoading(false);
        return;
      }

      try {
        // Refresh user data to get updated credits
        await refreshTokens();
        
        // The webhook will have already processed the payment and added credits
        // We just need to refresh the user data
        setIsLoading(false);
        setCreditsAdded(0); // Credits are added via webhook, we just refresh
        
        // Clear any stored return URL
        localStorage.removeItem('returnTo');
      } catch (err) {
        console.error('Error handling checkout success:', err);
        setError('Failed to process checkout');
        setIsLoading(false);
      }
    };

    handleSuccess();
  }, [searchParams, refreshTokens]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
          <p className="text-lg">Processing your payment...</p>
          <p className="text-sm text-muted-foreground mt-2">
            This may take a few moments
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-2xl text-destructive">Payment Error</CardTitle>
            <CardDescription>
              {error}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              className="w-full"
              variant="outline"
              onClick={() => router.push('/pricing')}
            >
              Back to Pricing
            </Button>
            <Button
              className="w-full"
              onClick={() => router.push('/dashboard')}
            >
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <CardTitle className="text-2xl">Payment Successful!</CardTitle>
          <CardDescription>
            Your credits have been added to your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">
              Session ID
            </p>
            <p className="text-xs font-mono break-all">
              {searchParams.get('session_id')}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              You can now use your credits to take AI-graded exams.
            </p>
          </div>
          <div className="space-y-2">
            <Button
              className="w-full"
              onClick={() => router.push('/dashboard')}
            >
              Go to Dashboard
            </Button>
            <Button
              className="w-full"
              variant="outline"
              onClick={() => router.push('/pricing')}
            >
              Buy More Credits
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
