import { NextRequest, NextResponse } from 'next/server';
import { createCheckoutSession } from '@/lib/stripe/client';
import { CREDIT_PACKAGES } from '@/lib/stripe/config';
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

    const { priceId } = await req.json();
    
    // Validate priceId and get credits amount
    const creditPackage = CREDIT_PACKAGES.find(
      (pkg) => pkg.stripePriceId === priceId
    );
    
    if (!creditPackage) {
      return NextResponse.json(
        { error: 'Invalid price ID' },
        { status: 400 }
      );
    }

    const session = await createCheckoutSession({
      priceId,
      userId,
      credits: creditPackage.credits,
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 