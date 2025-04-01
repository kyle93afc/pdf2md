'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { loadStripe } from '@stripe/stripe-js';
import { CREDIT_PACKAGES } from '@/lib/stripe/config';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function PricingPlans() {
  const { user } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);

  const handleCheckout = async (priceId: string, credits: number) => {
    try {
      setLoading(priceId);
      
      // Get the Firebase ID token
      const token = await user?.getIdToken();
      
      if (!token) {
        throw new Error('User not authenticated');
      }

      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          priceId,
          credits,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout using the URL from the response
      window.location.href = data.url;
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to checkout. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="py-12 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Purchase PDF Credits
          </h2>
          <p className="mt-4 text-xl text-gray-600">
            Choose a credit package that suits your needs
          </p>
        </div>

        <div className="mt-12 space-y-4 sm:mt-16 sm:space-y-0 sm:grid sm:grid-cols-3 sm:gap-6 lg:max-w-4xl lg:mx-auto">
          {CREDIT_PACKAGES.map((pkg) => (
            <div
              key={pkg.id}
              className={`rounded-lg shadow-lg divide-y divide-gray-200 ${
                pkg.id === 'pro' ? 'border-2 border-blue-500' : ''
              }`}
            >
              <div className="p-6">
                {pkg.id === 'pro' && (
                  <span className="inline-flex px-4 py-1 rounded-full text-sm font-semibold tracking-wide uppercase bg-blue-100 text-blue-600 mb-4">
                    Most Popular
                  </span>
                )}
                <h3 className="text-2xl font-semibold text-gray-900">{pkg.name}</h3>
                <p className="mt-4 text-gray-500">Perfect for {pkg.credits} pages</p>
                <p className="mt-8">
                  <span className="text-4xl font-extrabold text-gray-900">${pkg.price}</span>
                </p>
                <p className="mt-2 text-gray-500">{pkg.credits} credits</p>
                <button
                  onClick={() => handleCheckout(pkg.stripePriceId, pkg.credits)}
                  disabled={!user || loading === pkg.stripePriceId || !pkg.stripePriceId}
                  className={`mt-8 block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-md transition duration-150 ease-in-out ${
                    !user || loading === pkg.stripePriceId || !pkg.stripePriceId ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {loading === pkg.stripePriceId ? 'Processing...' : 'Purchase Credits'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {!user && (
          <p className="mt-8 text-center text-gray-500">
            Please sign in to purchase credits
          </p>
        )}
      </div>
    </div>
  );
} 