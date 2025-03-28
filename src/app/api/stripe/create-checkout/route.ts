import { NextRequest, NextResponse } from 'next/server';
import stripe from '@/lib/stripe/stripe';
import { SUBSCRIPTION_TIERS } from '@/config/subscription-tiers';
import { auth } from '@/lib/firebase/firebase';
import { getUserSubscription } from '@/lib/services/subscription-service';

export async function POST(request: NextRequest) {
  try {
    // Get the request body
    const body = await request.json();
    const { tierId, returnUrl } = body;
    
    // Verify the tier exists
    const tier = SUBSCRIPTION_TIERS.find(t => t.id === tierId);
    if (!tier || tier.id === 'free' || !tier.stripePriceId) {
      return NextResponse.json(
        { error: 'Invalid subscription tier' }, 
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
    
    // Get the user's subscription to see if they have a Stripe customer ID
    const subscription = await getUserSubscription(authUser.uid);
    
    // Create or use existing customer
    let customerId = subscription?.stripeCustomerId;
    
    if (!customerId) {
      // Create a new customer in Stripe
      const customer = await stripe.customers.create({
        email: authUser.email || undefined,
        name: authUser.displayName || undefined,
        metadata: {
          firebaseUID: authUser.uid
        }
      });
      
      customerId = customer.id;
    }
    
    // Create a checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: tier.stripePriceId,
          quantity: 1
        }
      ],
      mode: 'subscription',
      success_url: `${returnUrl || process.env.NEXT_PUBLIC_APP_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${returnUrl || process.env.NEXT_PUBLIC_APP_URL}/subscription/cancel`,
      metadata: {
        firebaseUID: authUser.uid,
        tierId: tier.id
      }
    });
    
    return NextResponse.json({ url: session.url });
    
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' }, 
      { status: 500 }
    );
  }
} 