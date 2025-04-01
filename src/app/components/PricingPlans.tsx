import { useState } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const creditPackages = [
  {
    name: 'Starter',
    credits: 100,
    price: 5,
    priceId: 'price_starter',
    description: 'Perfect for small documents',
  },
  {
    name: 'Professional',
    credits: 500,
    price: 20,
    priceId: 'price_professional',
    description: 'Great for regular use',
    popular: true,
  },
  {
    name: 'Enterprise',
    credits: 2000,
    price: 50,
    priceId: 'price_enterprise',
    description: 'Best value for heavy users',
  },
];

export default function PricingPlans() {
  const { user } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);

  const handleCheckout = async (priceId: string, credits: number) => {
    try {
      setLoading(priceId);
      
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          credits,
        }),
      });

      const { sessionId } = await response.json();
      const stripe = await stripePromise;
      
      if (!stripe) {
        throw new Error('Stripe failed to load');
      }

      const { error } = await stripe.redirectToCheckout({
        sessionId,
      });

      if (error) {
        throw error;
      }
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
          {creditPackages.map((pkg) => (
            <div
              key={pkg.priceId}
              className={`rounded-lg shadow-lg divide-y divide-gray-200 ${
                pkg.popular ? 'border-2 border-blue-500' : ''
              }`}
            >
              <div className="p-6">
                {pkg.popular && (
                  <span className="inline-flex px-4 py-1 rounded-full text-sm font-semibold tracking-wide uppercase bg-blue-100 text-blue-600 mb-4">
                    Most Popular
                  </span>
                )}
                <h3 className="text-2xl font-semibold text-gray-900">{pkg.name}</h3>
                <p className="mt-4 text-gray-500">{pkg.description}</p>
                <p className="mt-8">
                  <span className="text-4xl font-extrabold text-gray-900">${pkg.price}</span>
                </p>
                <p className="mt-2 text-gray-500">{pkg.credits} credits</p>
                <button
                  onClick={() => handleCheckout(pkg.priceId, pkg.credits)}
                  disabled={!user || loading === pkg.priceId}
                  className={`mt-8 block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-md transition duration-150 ease-in-out ${
                    !user || loading === pkg.priceId ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {loading === pkg.priceId ? 'Processing...' : 'Purchase Credits'}
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