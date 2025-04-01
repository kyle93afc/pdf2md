import { loadStripe, Stripe } from '@stripe/stripe-js';

let stripePromise: Promise<Stripe | null>;

export const getStripe = () => {
  if (!stripePromise) {
    if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
      throw new Error('Stripe publishable key is not set');
    }
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
  }
  return stripePromise;
};

export const createCheckoutSession = async (priceId: string) => {
  try {
    const response = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ priceId }),
    });

    const { sessionId } = await response.json();
    const stripe = await getStripe();

    if (!stripe) {
      throw new Error('Failed to load Stripe');
    }

    // Redirect to Stripe Checkout
    const { error } = await stripe.redirectToCheckout({ sessionId });
    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error in createCheckoutSession:', error);
    throw error;
  }
}; 