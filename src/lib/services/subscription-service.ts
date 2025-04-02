import { adminDb } from '../firebase/admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { UserSubscription } from '@/types/subscription-types';
import { SUBSCRIPTION_TIERS } from '@/config/subscription-tiers';

// Collection names
const SUBSCRIPTIONS_COLLECTION = 'user_subscriptions';
const USAGE_COLLECTION = 'usage';

/**
 * Get a user's subscription using Admin SDK
 */
export async function getUserSubscription(userId: string): Promise<UserSubscription | null> {
  try {
    const subscriptionRef = adminDb.collection(SUBSCRIPTIONS_COLLECTION).doc(userId);
    const subscriptionDoc = await subscriptionRef.get();
    
    if (subscriptionDoc.exists) {
      return subscriptionDoc.data() as UserSubscription;
    }
    
    // If no subscription exists, create a free tier subscription
    const freeTier = SUBSCRIPTION_TIERS.find(tier => tier.id === 'free');
    if (!freeTier) throw new Error('Free tier not found');
    
    const now = Timestamp.now();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);
    
    const newSubscription: UserSubscription = {
      userId,
      tierId: 'free',
      status: 'active',
      currentPeriodStart: now.toMillis(),
      currentPeriodEnd: endDate.getTime(),
      pagesUsedThisMonth: 0
    };
    
    await subscriptionRef.set(newSubscription);
    return newSubscription;
    
  } catch (error) {
    console.error('Error getting user subscription (Admin SDK):', error);
    return null;
  }
}

/**
 * Get the number of pages a user has remaining based on their subscription
 */
export async function getPagesRemaining(userId: string): Promise<number> {
  try {
    const subscription = await getUserSubscription(userId);
    if (!subscription) return 0;
    
    const tier = SUBSCRIPTION_TIERS.find(t => t.id === subscription.tierId);
    if (!tier) return 0;
    
    return Math.max(0, tier.pagesPerMonth - subscription.pagesUsedThisMonth);
  } catch (error) {
    console.error('Error getting pages remaining:', error);
    return 0;
  }
}

/**
 * Record usage of pages by a user using Admin SDK
 */
export async function recordPageUsage(userId: string, pageCount: number): Promise<boolean> {
  try {
    const subscription = await getUserSubscription(userId);
    if (!subscription) return false;
    
    const pagesRemaining = await getPagesRemaining(userId);
    if (pagesRemaining < pageCount) return false;
    
    const subscriptionRef = adminDb.collection(SUBSCRIPTIONS_COLLECTION).doc(userId);
    await subscriptionRef.update({
      pagesUsedThisMonth: FieldValue.increment(pageCount)
    });
    
    await adminDb.collection(USAGE_COLLECTION).add({
      userId,
      pageCount,
      timestamp: Timestamp.now(),
      subscriptionTier: subscription.tierId
    });
    
    return true;
  } catch (error) {
    console.error('Error recording page usage (Admin SDK):', error);
    return false;
  }
}

/**
 * Update a user's subscription tier using Admin SDK
 */
export async function updateSubscriptionTier(
  userId: string, 
  tierId: string,
  stripeCustomerId?: string,
  stripeSubscriptionId?: string
): Promise<boolean> {
  try {
    const tier = SUBSCRIPTION_TIERS.find(t => t.id === tierId);
    if (!tier) return false;
    
    const now = Timestamp.now();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);
    
    const subscriptionRef = adminDb.collection(SUBSCRIPTIONS_COLLECTION).doc(userId);
    await subscriptionRef.update({
      tierId,
      status: 'active',
      currentPeriodStart: now.toMillis(),
      currentPeriodEnd: endDate.getTime(),
      pagesUsedThisMonth: 0,
      ...(stripeCustomerId && { stripeCustomerId }),
      ...(stripeSubscriptionId && { stripeSubscriptionId })
    });
    
    return true;
  } catch (error) {
    console.error('Error updating subscription tier (Admin SDK):', error);
    return false;
  }
} 