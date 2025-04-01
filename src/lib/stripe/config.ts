import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
}

if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
  throw new Error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set in environment variables');
}

if (!process.env.STRIPE_WEBHOOK_SECRET) {
  throw new Error('STRIPE_WEBHOOK_SECRET is not set in environment variables');
}

// Initialize Stripe with secret key for server-side operations
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-02-24.acacia',
  typescript: true,
});

export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  stripePriceId: string;
}

// Define available credit packages
export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: 'basic',
    name: 'Basic Package',
    credits: 100,
    price: 9.99,
    stripePriceId: process.env.STRIPE_PRICE_BASIC || '',
  },
  {
    id: 'pro',
    name: 'Pro Package',
    credits: 500,
    price: 39.99,
    stripePriceId: process.env.STRIPE_PRICE_PRO || '',
  },
  {
    id: 'enterprise',
    name: 'Enterprise Package',
    credits: 2000,
    price: 149.99,
    stripePriceId: process.env.STRIPE_PRICE_ENTERPRISE || '',
  },
]; 