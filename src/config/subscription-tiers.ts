import { SubscriptionTier } from '@/types/subscription-types';

export const SUBSCRIPTION_TIERS: SubscriptionTier[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Basic PDF to Markdown conversion',
    price: 0,
    pagesPerMonth: 10,
    features: [
      'Convert up to 10 pages per month',
      'Basic markdown formatting',
      'Image extraction',
      'ZIP download'
    ]
  },
  {
    id: 'standard',
    name: 'Standard',
    description: 'Enhanced conversion for regular users',
    price: 9.99,
    pagesPerMonth: 100,
    features: [
      'Convert up to 100 pages per month',
      'Advanced formatting',
      'Image optimization',
      'ZIP download',
      'Obsidian compatibility',
      'Priority processing'
    ],
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_STANDARD_PRICE_ID
  },
  {
    id: 'premium',
    name: 'Premium',
    description: 'Professional conversion for power users',
    price: 19.99,
    pagesPerMonth: 500,
    features: [
      'Convert up to 500 pages per month',
      'Advanced formatting',
      'Image optimization',
      'ZIP download',
      'Obsidian compatibility',
      'Priority processing',
      'Batch processing',
      'API access'
    ],
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID
  }
]; 