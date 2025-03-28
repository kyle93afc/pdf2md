import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import stripe from '@/lib/stripe/stripe';
import { updateSubscriptionTier } from '@/lib/services/subscription-service';

// Disable body parsing, we need the raw body
export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = headers().get('stripe-signature') || '';
    
    // This is your Stripe webhook secret for testing your endpoint locally
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }
    
    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      return NextResponse.json(
        { error: `Webhook signature verification failed: ${err instanceof Error ? err.message : 'Unknown error'}` },
        { status: 400 }
      );
    }
    
    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        
        // Extract metadata
        const { firebaseUID, tierId } = session.metadata;
        
        if (firebaseUID && tierId) {
          // Update the user's subscription
          await updateSubscriptionTier(
            firebaseUID,
            tierId,
            session.customer as string,
            session.subscription as string
          );
        }
        break;
      }
      
      case 'customer.subscription.updated': {
        const subscription = event.data.object as any;
        const customerId = subscription.customer;
        
        // Find user by customer ID and update their subscription status
        // This is simplified, in a real app you would need to query your database to find the user by customer ID
        // For now, we'll assume the user ID is in the metadata
        if (subscription.metadata && subscription.metadata.firebaseUID) {
          await updateSubscriptionTier(
            subscription.metadata.firebaseUID,
            subscription.metadata.tierId,
            customerId,
            subscription.id
          );
        }
        break;
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any;
        // Handle subscription cancellation
        if (subscription.metadata && subscription.metadata.firebaseUID) {
          // Downgrade to free tier
          await updateSubscriptionTier(
            subscription.metadata.firebaseUID,
            'free'
          );
        }
        break;
      }
    }
    
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error in Stripe webhook:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
} 