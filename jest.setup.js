// Mock environment variables
process.env.STRIPE_SECRET_KEY = 'test_stripe_secret_key';
process.env.STRIPE_WEBHOOK_SECRET = 'test_stripe_webhook_secret';
process.env.NEXT_PUBLIC_BASE_URL = 'http://localhost:3000';
process.env.FIREBASE_API_KEY = 'test_firebase_api_key';

// Mock Next.js headers
jest.mock('next/headers', () => ({
  headers: () => new Map([['stripe-signature', 'test_signature']]),
}));

// Mock Firebase
jest.mock('@/lib/firebase/firebase', () => ({
  auth: {
    currentUser: {
      uid: 'test_user_id',
      email: 'test@example.com'
    }
  },
  db: {
    collection: jest.fn().mockReturnThis(),
    doc: jest.fn().mockReturnThis(),
    add: jest.fn(),
    update: jest.fn(),
    get: jest.fn(),
  }
}));

// Mock Firebase Admin
const mockCollection = jest.fn().mockImplementation((collectionName) => ({
  doc: jest.fn().mockReturnValue({
    update: jest.fn().mockResolvedValue(true),
  }),
  add: jest.fn().mockResolvedValue({ id: 'test_doc_id' }),
}));

jest.mock('@/lib/firebase/admin', () => ({
  adminDb: {
    collection: mockCollection,
  },
  adminAuth: {
    verifyIdToken: jest.fn().mockResolvedValue({ uid: 'test_user_id' }),
  },
}));

// Mock Stripe config and webhook
const mockCreditPackages = [
  {
    name: 'Test Package',
    credits: 100,
    price: 10,
    stripePriceId: 'price_test123',
  }
];

jest.mock('@/lib/stripe/config', () => ({
  CREDIT_PACKAGES: mockCreditPackages,
  stripe: {
    webhooks: {
      constructEvent: jest.fn().mockImplementation((body, signature, secret) => {
        if (signature === 'test_signature' && secret === process.env.STRIPE_WEBHOOK_SECRET) {
          const event = JSON.parse(body);
          return {
            ...event,
            id: 'evt_test123',
            object: 'event',
            api_version: '2023-10-16',
            created: Date.now(),
            livemode: false,
            pending_webhooks: 0,
            request: { id: 'req_123', idempotency_key: 'key_123' }
          };
        }
        throw new Error('Invalid signature');
      }),
    },
  },
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
}));

// Mock Stripe client functions
const mockCheckoutSession = {
  id: 'cs_test123',
  url: 'https://checkout.stripe.com/test'
};

jest.mock('@/lib/stripe/client', () => ({
  createCheckoutSession: jest.fn().mockResolvedValue(mockCheckoutSession),
  updateUserCredits: jest.fn().mockImplementation(async (userId, credits) => {
    await mockCollection('users').doc(userId).update({ credits });
    return true;
  }),
  createOrRetrieveCustomer: jest.fn().mockResolvedValue('cus_test123'),
  createCustomerPortalSession: jest.fn().mockResolvedValue({ url: 'https://billing.stripe.com/test' }),
})); 