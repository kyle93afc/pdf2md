"use client";

import { useState } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Check, Loader2 } from 'lucide-react';
import { SUBSCRIPTION_TIERS } from '@/config/subscription-tiers';
import { toast } from 'sonner';

export default function SubscriptionTiers() {
  const { user, loading: authLoading } = useAuth();
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubscribe = async (tierId: string) => {
    if (!user) {
      toast.error('Please sign in to subscribe');
      return;
    }

    if (tierId === 'free') {
      toast.success('You are now on the Free plan');
      return;
    }

    try {
      setIsLoading(true);
      setSelectedTier(tierId);

      // Get the Firebase ID token
      const token = await user.getIdToken();
      
      // Find the selected tier
      const selectedTierData = SUBSCRIPTION_TIERS.find(tier => tier.id === tierId);
      
      if (!selectedTierData?.stripePriceId) {
        throw new Error('Invalid subscription tier');
      }

      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          priceId: selectedTierData.stripePriceId,
          credits: selectedTierData.pagesPerMonth
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (error) {
      console.error('Error subscribing:', error);
      toast.error('Failed to process subscription');
    } finally {
      setIsLoading(false);
      setSelectedTier(null);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-8">
      {SUBSCRIPTION_TIERS.map((tier) => (
        <Card key={tier.id} className="p-6 flex flex-col">
          <h3 className="text-xl font-semibold mb-2">{tier.name}</h3>
          <div className="mb-4">
            <span className="text-3xl font-bold">
              ${tier.price}
            </span>
            {tier.price > 0 && <span className="text-muted-foreground ml-1">/month</span>}
          </div>
          <p className="text-muted-foreground mb-4">{tier.description}</p>
          
          <div className="mb-6 flex-grow">
            <p className="font-medium mb-2">Features:</p>
            <ul className="space-y-2">
              {tier.features.map((feature, index) => (
                <li key={index} className="flex items-start">
                  <Check className="mr-2 h-5 w-5 text-green-500 shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
          
          <Button 
            onClick={() => handleSubscribe(tier.id)} 
            disabled={isLoading && selectedTier === tier.id || authLoading}
            variant={tier.id === 'free' ? 'outline' : tier.id === 'premium' ? 'default' : 'secondary'}
            className="mt-auto"
          >
            {isLoading && selectedTier === tier.id ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              tier.id === 'free' ? 'Start Free' : 'Subscribe'
            )}
          </Button>
        </Card>
      ))}
    </div>
  );
} 