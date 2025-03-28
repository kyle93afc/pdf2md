import { NextRequest, NextResponse } from 'next/server';
import stripe from '@/lib/stripe/stripe';
import { auth } from '@/lib/firebase/firebase';
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
    
    // Get the currently logged in user
    const authUser = auth.currentUser;
    if (!authUser) {
      return NextResponse.json(
        { error: 'User not authenticated' }, 
        { status: 401 }
      );
    }
    
    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    // Verify the session was successful and belongs to the current user
    if (session.status !== 'complete') {
      return NextResponse.json(
        { error: 'Payment not completed' }, 
        { status: 400 }
      );
    }
    
    if (session.metadata?.firebaseUID !== authUser.uid) {
      return NextResponse.json(
        { error: 'Session does not belong to the current user' }, 
        { status: 403 }
      );
    }
    
    // Get the user's subscription
    const subscription = await getUserSubscription(authUser.uid);
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