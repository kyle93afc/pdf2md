import { NextRequest, NextResponse } from 'next/server';
import stripe from '@/lib/stripe/stripe';
import { adminAuth } from '@/lib/firebase/admin';
import { getUserSubscription } from '@/lib/services/subscription-service';

export async function GET(request: NextRequest) {
  try {
    // Get the session ID from the query params
    const sessionId = request.nextUrl.searchParams.get('session_id');
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing session ID' }, 
        { status: 400 }
      );
    }
    
    // Get Authorization header and verify token
    const authorization = request.headers.get('Authorization');
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Missing or invalid token' }, { status: 401 });
    }
    const idToken = authorization.split('Bearer ')[1];

    // Verify ID token using Firebase Admin SDK
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (error) {
      console.error('Error verifying Firebase ID token:', error);
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }
    const userId = decodedToken.uid;
    
    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    // Verify the session was successful and belongs to the current user
    if (session.status !== 'complete') {
      return NextResponse.json(
        { error: 'Payment not completed' }, 
        { status: 400 }
      );
    }
    
    if (session.metadata?.firebaseUID !== userId) {
      return NextResponse.json(
        { error: 'Session does not belong to the current user' }, 
        { status: 403 }
      );
    }
    
    // Get the user's subscription
    const subscription = await getUserSubscription(userId);
    if (!subscription) {
      return NextResponse.json(
        { error: 'Subscription not found' }, 
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      subscription: {
        tierId: subscription.tierId,
        status: subscription.status,
        currentPeriodEnd: subscription.currentPeriodEnd,
        pagesUsedThisMonth: subscription.pagesUsedThisMonth
      }
    });
    
  } catch (error) {
    console.error('Error verifying checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to verify checkout session' }, 
      { status: 500 }
    );
  }
} 