import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminAuth } from '@/lib/firebase/admin';
import { SUBSCRIPTION_TIERS } from '@/config/subscription-tiers';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

export async function POST(req: NextRequest) {
  try {
    // 1. Get Authorization header
    const authorization = req.headers.get('Authorization');
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Missing or invalid token' }, { status: 401 });
    }
    const idToken = authorization.split('Bearer ')[1];

    // 2. Verify ID token using Firebase Admin SDK
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (error) {
      console.error('Error verifying Firebase ID token:', error);
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }
    const userId = decodedToken.uid;

    // 3. Proceed with checkout creation using the verified userId
    const { priceId, credits } = await req.json();

    if (!priceId || !credits) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if this is a subscription purchase by looking up the price ID in subscription tiers
    const isSubscription = SUBSCRIPTION_TIERS.some(tier => tier.stripePriceId === priceId);

    const session = await stripe.checkout.sessions.create({
      mode: isSubscription ? 'subscription' : 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        firebaseUID: userId,
        credits: credits.toString(),
        type: isSubscription ? 'subscription' : 'credits'
      },
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}${
        isSubscription ? '/subscription/success' : '/dashboard'
      }?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}${
        isSubscription ? '/subscription/cancel' : '/dashboard'
      }?canceled=true`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Error creating checkout session: ${errorMessage}` },
      { status: 500 }
    );
  }
} 