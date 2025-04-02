import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe, STRIPE_WEBHOOK_SECRET } from '@/lib/stripe/config';
import { adminDb } from '@/lib/firebase/admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import Stripe from 'stripe';

export async function POST(req: NextRequest) {
  if (!stripe) {
    console.error('Webhook Error: Stripe not initialized. Check STRIPE_SECRET_KEY.');
    return NextResponse.json(
      { error: 'Internal Server Error: Stripe configuration missing' },
      { status: 500 }
    );
  }

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
          console.error('Webhook Error: Missing userId or credits in metadata', metadata);
          throw new Error('Missing required metadata');
        }

        const userId = metadata.userId;
        const creditsToAdd = Number(metadata.credits);

        if (isNaN(creditsToAdd)) {
           console.error('Webhook Error: Invalid credits value in metadata', metadata.credits);
           throw new Error('Invalid credits value');
        }

        // --- START: Server-side credit update logic ---
        const userCreditsRef = adminDb.collection('user_credits').doc(userId);

        try {
            await adminDb.runTransaction(async (transaction) => {
              const userCreditsDoc = await transaction.get(userCreditsRef);

              if (!userCreditsDoc.exists) {
                // Create the document if it doesn't exist
                transaction.set(userCreditsRef, {
                  balance: creditsToAdd,
                  lastUpdated: Timestamp.now(), // Use Firestore Admin Timestamp
                });
              } else {
                // Increment the balance if the document exists
                transaction.update(userCreditsRef, {
                  // Use Firestore Admin FieldValue for increment
                  balance: FieldValue.increment(creditsToAdd), 
                  lastUpdated: Timestamp.now(),
                });
              }
            });
             console.log(`Successfully updated credits for user ${userId}. Added: ${creditsToAdd}`);
        } catch (error) {
            console.error(`Error updating credits for user ${userId} in transaction:`, error);
            // Decide if you want to throw the error to stop the webhook processing 
            // or just log it and continue (e.g., to still record payment history).
            // Throwing it will make Stripe retry the webhook.
            throw new Error(`Failed to update user credits: ${error}`); 
        }
        // --- END: Server-side credit update logic ---


        // Store payment history
        await adminDb.collection('payment_history').add({
          userId: userId, // Use validated userId
          transactionId: session.id,
          amount: session.amount_total ? session.amount_total / 100 : 0,
          credits: creditsToAdd, // Use validated creditsToAdd
          status: 'succeeded',
          createdAt: Timestamp.now(),
        });
        console.log(`Successfully recorded payment history for user ${userId}, transaction ${session.id}`);

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
    // Ensure error message is included in response for easier debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown webhook error';
    return NextResponse.json(
      { error: `Webhook handler failed: ${errorMessage}` },
      { status: 400 } // Use 400 for client-side errors (like bad metadata), 500 for server issues
    );
  }
} 