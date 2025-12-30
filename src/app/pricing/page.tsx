'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Loader2 } from 'lucide-react';

const creditPacks = [
  {
    id: 'pack_a',
    name: 'Starter',
    description: '2 Credits for casual learners',
    price: 9.99,
    credits: 2,
    features: [
      '2 AI-graded exams',
      'All exam types included',
      'Basic feedback',
      '1 month validity',
    ],
    popular: false,
  },
  {
    id: 'pack_b',
    name: 'Standard',
    description: '5 Credits for dedicated learners',
    price: 19.99,
    credits: 5,
    features: [
      '5 AI-graded exams',
      'All exam types included',
      'Detailed feedback',
      'Progress tracking',
      '3 months validity',
    ],
    popular: true,
  },
  {
    id: 'pack_c',
    name: 'Premium',
    description: '15 Credits for serious learners',
    price: 44.99,
    credits: 15,
    features: [
      '15 AI-graded exams',
      'All exam types included',
      'Advanced analytics',
      'Priority support',
      '6 months validity',
    ],
    popular: false,
  },
];

export default function PricingPage() {
  const { isAuthenticated, user, login } = useAuth();
  const router = useRouter();
  const [loadingPack, setLoadingPack] = useState<string | null>(null);

  const handleBuyNow = async (packId: string) => {
    if (!isAuthenticated) {
      // Redirect to login with return URL
      router.push(`/?returnTo=/pricing`);
      return;
    }

    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
      router.push('/');
      return;
    }

    setLoadingPack(packId);

    try {
      const response = await fetch('/api/checkout/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ packId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert(error instanceof Error ? error.message : 'Failed to create checkout session');
    } finally {
      setLoadingPack(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      {/* Header */}
      <header className="border-b bg-background/50 backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">ForgeLang</h1>
            </div>
            {isAuthenticated ? (
              <div className="flex items-center gap-4">
                <div className="text-sm">
                  <span className="text-muted-foreground">Credits:</span>{' '}
                  <span className="font-semibold">{user?.credits || 0}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/dashboard')}
                >
                  Dashboard
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/')}
              >
                Login
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">Choose Your Credit Pack</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Purchase credits to access AI-powered language exams. Each credit gives you one complete exam with detailed feedback.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {creditPacks.map((pack) => (
            <Card
              key={pack.id}
              className={`relative flex flex-col ${
                pack.popular
                  ? 'border-2 border-primary shadow-lg scale-105'
                  : 'border'
              }`}
            >
              {pack.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                  Most Popular
                </Badge>
              )}
              <CardHeader>
                <CardTitle className="text-2xl">{pack.name}</CardTitle>
                <CardDescription>{pack.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="mb-6">
                  <span className="text-4xl font-bold">${pack.price}</span>
                  <span className="text-muted-foreground ml-2">one-time</span>
                </div>
                <div className="mb-6">
                  <div className="text-2xl font-semibold mb-2">
                    {pack.credits} {pack.credits === 1 ? 'Credit' : 'Credits'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    ${(pack.price / pack.credits).toFixed(2)} per credit
                  </div>
                </div>
                <ul className="space-y-3">
                  {pack.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => handleBuyNow(pack.id)}
                  disabled={loadingPack === pack.id}
                  variant={pack.popular ? 'default' : 'outline'}
                >
                  {loadingPack === pack.id ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Checkout...
                    </>
                  ) : (
                    'Buy Now'
                  )}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h3 className="text-2xl font-bold mb-6 text-center">
            Frequently Asked Questions
          </h3>
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">How do credits work?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Each credit gives you access to one complete AI-graded exam. You can choose from Reading, Listening, Writing, or Speaking exams.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Do credits expire?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Yes, credits have different validity periods depending on the pack you purchase: 1 month for Starter, 3 months for Standard, and 6 months for Premium.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Can I get a refund?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Refunds are available in case of technical issues or exam failures. Contact support for assistance with refunds.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-16 bg-background/50 backdrop-blur">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center text-sm text-muted-foreground">
            <p>&copy; 2024 ForgeLang. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
