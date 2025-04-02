import { SubscriptionTier } from '@/types/subscription-types';

export const SUBSCRIPTION_TIERS: SubscriptionTier[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Basic PDF to Markdown conversion',
    price: 0,
    pagesPerMonth: 50,
    features: [
      'Convert up to 50 pages per month',
      'Basic markdown formatting',
      'Image extraction',
      'ZIP download'
    ]
  },
  {
    id: 'standard',
    name: 'Standard',
    description: 'Enhanced conversion for regular users',
    price: 10,
    pagesPerMonth: 1000,
    features: [
      'Convert up to 1,000 pages per month',
      'Advanced formatting',
      'Image optimization',
      'ZIP download',
      'Obsidian compatibility',
      'Priority processing'
    ],
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_BASIC
  },
  {
    id: 'premium',
    name: 'Premium',
    description: 'Professional conversion for power users',
    price: 20,
    pagesPerMonth: 2000,
    features: [
      'Convert up to 2,000 pages per month',
      'Advanced formatting',
      'Image optimization',
      'ZIP download',
      'Obsidian compatibility',
      'Priority processing',
      'Batch processing',
      'API access'
    ],
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Maximum conversion power for large organizations',
    price: 100,
    pagesPerMonth: 10000,
    features: [
      'Convert up to 10,000 pages per month',
      'Advanced formatting',
      'Image optimization',
      'ZIP download',
      'Obsidian compatibility',
      'Priority processing',
      'Batch processing',
      'API access',
      'Custom integrations',
      'Dedicated support'
    ],
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE
  }
]; 