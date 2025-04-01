import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/firebase/firebase';
import { doc, runTransaction, collection, addDoc } from 'firebase/firestore';

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

async function updateUserCredits(userId: string, credits: number) {
  const userRef = doc(db, 'users', userId);
  
  await runTransaction(db, async (transaction) => {
    const userDoc = await transaction.get(userRef);
    if (!userDoc.exists()) {
      throw new Error('User not found');
    }

    const currentCredits = userDoc.data().credits || 0;
    transaction.update(userRef, {
      credits: currentCredits + credits,
      lastUpdated: new Date(),
    });
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const headersList = headers();
    const signature = headersList.get('stripe-signature')!;

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return new NextResponse('Webhook signature verification failed', { status: 400 });
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const metadata = session.metadata || {};
        
        // If this is a test event (no metadata), just log and return success
        if (!metadata.userId || !metadata.credits) {
          console.log('Test event received - no metadata present');
          return new NextResponse('Test event processed', { status: 200 });
        }

        await updateUserCredits(
          metadata.userId,
          parseInt(metadata.credits)
        );

        // Create payment history record
        const paymentRecord = {
          userId: metadata.userId,
          transactionId: session.id,
          amount: session.amount_total! / 100, // Convert from cents
          credits: parseInt(metadata.credits),
          status: 'succeeded',
          createdAt: new Date(),
        };

        await addDoc(collection(db, 'paymentHistory'), paymentRecord);
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('Payment succeeded:', paymentIntent.id);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.error('Payment failed:', paymentIntent.id);
        break;
      }

      default: {
        console.log(`Unhandled event type: ${event.type}`);
      }
    }

    return new NextResponse('Webhook processed successfully', { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return new NextResponse(
      `Webhook handler failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 
      { status: 400 }
    );
  }
} 