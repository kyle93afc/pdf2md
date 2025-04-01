import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe, STRIPE_WEBHOOK_SECRET } from '@/lib/stripe/config';
import { updateUserCredits } from '@/lib/stripe/client';
import { adminDb } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import Stripe from 'stripe';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = headers().get('stripe-signature');

  if (!signature || !STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: 'Missing signature or webhook secret' },
      { status: 400 }
    );
  }

  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      STRIPE_WEBHOOK_SECRET
    );

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const metadata = session.metadata;

        if (!metadata?.userId || !metadata?.credits) {
          throw new Error('Missing required metadata');
        }

        // Update user credits
        await updateUserCredits(metadata.userId, Number(metadata.credits));

        // Store payment history
        await adminDb.collection('payment_history').add({
          userId: metadata.userId,
          transactionId: session.id,
          amount: session.amount_total ? session.amount_total / 100 : 0,
          credits: Number(metadata.credits),
          status: 'succeeded',
          createdAt: Timestamp.now(),
        });

        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const metadata = paymentIntent.metadata;

        if (!metadata?.userId) {
          throw new Error('Missing required metadata');
        }

        // Store failed payment attempt
        await adminDb.collection('payment_history').add({
          userId: metadata.userId,
          transactionId: paymentIntent.id,
          amount: paymentIntent.amount ? paymentIntent.amount / 100 : 0,
          status: 'failed',
          createdAt: Timestamp.now(),
        });

        break;
      }

      // Add other event types as needed
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error handling webhook:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 400 }
    );
  }
} 