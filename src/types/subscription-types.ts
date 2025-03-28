export interface SubscriptionTier {
  id: string;
  name: string;
  description: string;
  price: number;
  pagesPerMonth: number;
  features: string[];
  stripePriceId?: string;
}

export interface UserSubscription {
  userId: string;
  tierId: string;
  status: 'active' | 'canceled' | 'past_due' | 'unpaid';
  currentPeriodStart: number;
  currentPeriodEnd: number;
  pagesUsedThisMonth: number;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
} 