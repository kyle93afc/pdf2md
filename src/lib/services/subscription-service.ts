import { db } from '../firebase/firebase';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  increment, 
  Timestamp 
} from 'firebase/firestore';
import { UserSubscription } from '@/types/subscription-types';
import { SUBSCRIPTION_TIERS } from '@/config/subscription-tiers';

// Collection names
const SUBSCRIPTIONS_COLLECTION = 'subscriptions';
const USAGE_COLLECTION = 'usage';

/**
 * Get a user's subscription
 */
export async function getUserSubscription(userId: string): Promise<UserSubscription | null> {
  try {
    const subscriptionDoc = await getDoc(doc(db, SUBSCRIPTIONS_COLLECTION, userId));
    
    if (subscriptionDoc.exists()) {
      return subscriptionDoc.data() as UserSubscription;
    }
    
    // If no subscription exists, create a free tier subscription
    const freeTier = SUBSCRIPTION_TIERS.find(tier => tier.id === 'free');
    if (!freeTier) throw new Error('Free tier not found');
    
    const now = Date.now();
    // Set end date to one month from now
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);
    
    const newSubscription: UserSubscription = {
      userId,
      tierId: 'free',
      status: 'active',
      currentPeriodStart: now,
      currentPeriodEnd: endDate.getTime(),
      pagesUsedThisMonth: 0
    };
    
    await setDoc(doc(db, SUBSCRIPTIONS_COLLECTION, userId), newSubscription);
    return newSubscription;
    
  } catch (error) {
    console.error('Error getting user subscription:', error);
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
 * Record usage of pages by a user
 */
export async function recordPageUsage(userId: string, pageCount: number): Promise<boolean> {
  try {
    // Get current subscription
    const subscription = await getUserSubscription(userId);
    if (!subscription) return false;
    
    // Check if user has enough pages remaining
    const pagesRemaining = await getPagesRemaining(userId);
    if (pagesRemaining < pageCount) return false;
    
    // Update pages used
    await updateDoc(doc(db, SUBSCRIPTIONS_COLLECTION, userId), {
      pagesUsedThisMonth: increment(pageCount)
    });
    
    // Record usage event
    await setDoc(doc(collection(db, USAGE_COLLECTION)), {
      userId,
      pageCount,
      timestamp: Timestamp.now(),
      subscriptionTier: subscription.tierId
    });
    
    return true;
  } catch (error) {
    console.error('Error recording page usage:', error);
    return false;
  }
}

/**
 * Update a user's subscription tier
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
    
    const now = Date.now();
    // Set end date to one month from now
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);
    
    await updateDoc(doc(db, SUBSCRIPTIONS_COLLECTION, userId), {
      tierId,
      status: 'active',
      currentPeriodStart: now,
      currentPeriodEnd: endDate.getTime(),
      pagesUsedThisMonth: 0,
      ...(stripeCustomerId && { stripeCustomerId }),
      ...(stripeSubscriptionId && { stripeSubscriptionId })
    });
    
    return true;
  } catch (error) {
    console.error('Error updating subscription tier:', error);
    return false;
  }
} 