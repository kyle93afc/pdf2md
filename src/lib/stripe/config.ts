import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
}

if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
  throw new Error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set in environment variables');
}

// Initialize Stripe with secret key for server-side operations
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-02-24.acacia', // Latest API version
  typescript: true,
});

// Credit package configurations
export const CREDIT_PACKAGES = [
  {
    id: 'basic',
    name: 'Basic',
    credits: 100,
    price: 5.00, // $5.00
    stripePriceId: 'price_1R93cTJaIfn3rsWTQqvkWxXm',
  },
  {
    id: 'pro',
    name: 'Professional',
    credits: 500,
    price: 20.00, // $20.00
    stripePriceId: 'price_1R93cUJaIfn3rsWT9GlefBov',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    credits: 2000,
    price: 50.00, // $50.00
    stripePriceId: 'price_1R93cUJaIfn3rsWT1bz66dAl',
  },
] as const;

// Webhook secret for verifying Stripe webhook events
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET; 