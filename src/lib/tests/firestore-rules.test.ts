import { initializeTestEnvironment, RulesTestEnvironment, RulesTestContext } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, collection, getDocs, Firestore } from 'firebase/firestore';
import fs from 'fs';
import { resolve } from 'path';

const PROJECT_ID = 'pdf2md-d7eb3';
let testEnv: RulesTestEnvironment;

describe('Firestore Security Rules', () => {
  beforeAll(async () => {
    // Load the rules file
    const rules = fs.readFileSync('firestore.rules', 'utf8');
    
    // Create the test environment
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: { 
        rules,
        // Use production project in test mode
        host: 'firestore.googleapis.com',
        port: 443,
        ssl: true
      }
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  // Test data
  const userId = 'test-user';
  const otherUserId = 'other-user';
  const testSubscription = {
    userId,
    tierId: 'free',
    status: 'active',
    currentPeriodStart: Date.now(),
    currentPeriodEnd: Date.now() + 30 * 24 * 60 * 60 * 1000,
    pagesUsedThisMonth: 0
  };
  const testStripeCustomer = {
    stripeCustomerId: 'cus_test123',
    email: 'test@example.com'
  };
  const testUsage = {
    userId,
    pageCount: 5,
    timestamp: new Date(),
    subscriptionTier: 'free'
  };

  describe('Stripe Customers Collection', () => {
    it('allows users to read their own customer data', async () => {
      const context = testEnv.authenticatedContext(userId);
      await testEnv.withSecurityRulesDisabled(async (adminContext: RulesTestContext) => {
        await setDoc(doc(adminContext.firestore(), 'stripe_customers', userId), testStripeCustomer);
      });

      await expect(
        getDoc(doc(context.firestore(), 'stripe_customers', userId))
      ).resolves.toBeDefined();
    });

    it('prevents users from reading other users customer data', async () => {
      const context = testEnv.authenticatedContext(userId);
      await testEnv.withSecurityRulesDisabled(async (adminContext: RulesTestContext) => {
        await setDoc(doc(adminContext.firestore(), 'stripe_customers', otherUserId), testStripeCustomer);
      });

      await expect(
        getDoc(doc(context.firestore(), 'stripe_customers', otherUserId))
      ).rejects.toThrow();
    });
  });

  describe('Subscriptions Collection', () => {
    it('allows users to read their own subscription', async () => {
      const context = testEnv.authenticatedContext(userId);
      await testEnv.withSecurityRulesDisabled(async (adminContext: RulesTestContext) => {
        await setDoc(doc(adminContext.firestore(), 'subscriptions', userId), testSubscription);
      });

      await expect(
        getDoc(doc(context.firestore(), 'subscriptions', userId))
      ).resolves.toBeDefined();
    });

    it('prevents users from writing to their subscription', async () => {
      const context = testEnv.authenticatedContext(userId);
      
      await expect(
        setDoc(doc(context.firestore(), 'subscriptions', userId), testSubscription)
      ).rejects.toThrow();
    });

    it('prevents users from reading other users subscriptions', async () => {
      const context = testEnv.authenticatedContext(userId);
      await testEnv.withSecurityRulesDisabled(async (adminContext: RulesTestContext) => {
        await setDoc(doc(adminContext.firestore(), 'subscriptions', otherUserId), testSubscription);
      });

      await expect(
        getDoc(doc(context.firestore(), 'subscriptions', otherUserId))
      ).rejects.toThrow();
    });
  });

  describe('Usage Collection', () => {
    it('allows users to read their own usage records', async () => {
      const context = testEnv.authenticatedContext(userId);
      await testEnv.withSecurityRulesDisabled(async (adminContext: RulesTestContext) => {
        const usageRef = doc(collection(adminContext.firestore(), 'usage'));
        await setDoc(usageRef, testUsage);
      });

      const usageSnapshot = await getDocs(collection(context.firestore(), 'usage'));
      expect(usageSnapshot.empty).toBe(false);
    });

    it('prevents users from writing usage records', async () => {
      const context = testEnv.authenticatedContext(userId);
      const usageRef = doc(collection(context.firestore(), 'usage'));
      
      await expect(
        setDoc(usageRef, testUsage)
      ).rejects.toThrow();
    });

    it('prevents users from reading other users usage records', async () => {
      const context = testEnv.authenticatedContext(userId);
      await testEnv.withSecurityRulesDisabled(async (adminContext: RulesTestContext) => {
        const usageRef = doc(collection(adminContext.firestore(), 'usage'));
        await setDoc(usageRef, { ...testUsage, userId: otherUserId });
      });

      const usageSnapshot = await getDocs(collection(context.firestore(), 'usage'));
      expect(usageSnapshot.empty).toBe(true);
    });
  });

  describe('Default Rules', () => {
    it('denies access to unknown collections', async () => {
      const context = testEnv.authenticatedContext(userId);
      
      await expect(
        getDoc(doc(context.firestore(), 'unknown', 'doc'))
      ).rejects.toThrow();
    });
  });
}); 