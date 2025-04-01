import { NextRequest, NextResponse } from 'next/server';
import { createCustomerPortalSession, createOrRetrieveCustomer } from '@/lib/stripe/client';
import { adminAuth } from '@/lib/firebase/admin';

export async function POST(req: NextRequest) {
  try {
    // Get the current user from Firebase Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Get or create Stripe customer
    const customerId = await createOrRetrieveCustomer(userId);
    const { returnUrl } = await req.json();

    const session = await createCustomerPortalSession({
      customerId,
      returnUrl: returnUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Error creating customer portal session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 