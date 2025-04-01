/// <reference types="jest" />

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { stripe } from '@/lib/stripe/config';
import { createCheckoutSession, updateUserCredits } from '@/lib/stripe/client';
import { adminDb } from '@/lib/firebase/admin';
import { NextRequest } from 'next/server';
import { POST as webhookHandler } from '@/app/api/stripe/webhook/route';
import { POST as checkoutHandler } from '@/app/api/stripe/checkout/route';
import type Stripe from 'stripe';
import type { Firestore } from 'firebase-admin/firestore';

// Mock data
const mockPriceId = 'price_test123';
const mockUserId = 'test_user_id';
const mockCredits = 100;

describe('Stripe Payment Integration Tests', () => {
  const mockStripeWebhook = stripe.webhooks.constructEvent as jest.MockedFunction<typeof stripe.webhooks.constructEvent>;
  const mockFirebaseCollection = adminDb.collection as jest.MockedFunction<typeof adminDb.collection>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Checkout Flow', () => {
    it('should create a checkout session successfully', async () => {
      const mockSession = {
        id: 'cs_test123',
        url: 'https://checkout.stripe.com/test'
      };

      (createCheckoutSession as jest.Mock).mockResolvedValue(mockSession);

      const req = new NextRequest('http://localhost:3000/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer valid_token`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ priceId: mockPriceId })
      });

      const response = await checkoutHandler(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('sessionId', mockSession.id);
      expect(createCheckoutSession).toHaveBeenCalledWith({
        priceId: mockPriceId,
        userId: mockUserId,
        credits: mockCredits
      });
    });

    it('should handle unauthorized requests', async () => {
      const req = new NextRequest('http://localhost:3000/api/stripe/checkout', {
        method: 'POST',
        body: JSON.stringify({ priceId: mockPriceId })
      });

      const response = await checkoutHandler(req);
      expect(response.status).toBe(401);
    });
  });

  describe('Webhook Handling', () => {
    it('should process successful payment webhook', async () => {
      const mockEvent = {
        type: 'checkout.session.completed' as const,
        data: {
          object: {
            id: 'cs_test123',
            metadata: {
              userId: mockUserId,
              credits: mockCredits.toString(),
            },
            amount_total: 1000, // $10.00
          },
        },
      };

      const req = new Request('http://localhost:3000/api/stripe/webhook', {
        method: 'POST',
        body: JSON.stringify(mockEvent),
        headers: {
          'stripe-signature': 'test_signature',
        },
      });

      const response = await webhookHandler(req);
      expect(response.status).toBe(200);
      expect(updateUserCredits).toHaveBeenCalledWith(mockUserId, mockCredits);
      expect(mockFirebaseCollection).toHaveBeenCalledWith('payment_history');
      expect(mockFirebaseCollection('payment_history').add).toHaveBeenCalledWith({
        userId: mockUserId,
        transactionId: 'cs_test123',
        amount: 10,
        credits: mockCredits,
        status: 'succeeded',
        createdAt: expect.any(Object),
      });
    });

    it('should handle failed payment webhook', async () => {
      const mockEvent = {
        type: 'payment_intent.payment_failed' as const,
        data: {
          object: {
            id: 'pi_test123',
            metadata: {
              userId: mockUserId,
            },
            amount: 1000, // $10.00
          },
        },
      };

      const req = new Request('http://localhost:3000/api/stripe/webhook', {
        method: 'POST',
        body: JSON.stringify(mockEvent),
        headers: {
          'stripe-signature': 'test_signature',
        },
      });

      const response = await webhookHandler(req);
      expect(response.status).toBe(200);
      expect(mockFirebaseCollection).toHaveBeenCalledWith('payment_history');
      expect(mockFirebaseCollection('payment_history').add).toHaveBeenCalledWith({
        userId: mockUserId,
        transactionId: 'pi_test123',
        amount: 10,
        status: 'failed',
        createdAt: expect.any(Object),
      });
    });

    it('should handle invalid webhook signatures', async () => {
      const req = new NextRequest('http://localhost:3000/api/stripe/webhook', {
        method: 'POST',
        headers: {
          'stripe-signature': 'invalid_signature'
        },
        body: JSON.stringify({})
      });

      const response = await webhookHandler(req);
      expect(response.status).toBe(400);
    });
  });

  describe('Credit System', () => {
    it('should update user credits correctly', async () => {
      await updateUserCredits(mockUserId, mockCredits);
      expect(mockFirebaseCollection).toHaveBeenCalledWith('users');
      expect(mockFirebaseCollection('users').doc).toHaveBeenCalledWith(mockUserId);
      expect(mockFirebaseCollection('users').doc(mockUserId).update).toHaveBeenCalledWith({ credits: mockCredits });
    });
  });
}); 