import { stripe } from './config';
import { auth, db } from '../firebase/firebase';
import { doc, setDoc, getDoc, updateDoc, increment, runTransaction } from 'firebase/firestore';

export interface CreateCheckoutSessionParams {
  priceId: string;
  userId: string;
  credits: number;
}

export interface CustomerPortalParams {
  customerId: string;
  returnUrl: string;
}

export const createOrRetrieveCustomer = async (userId: string, email?: string | null) => {
  const userRef = doc(db, 'stripe_customers', userId);
  const userDoc = await getDoc(userRef);

  if (userDoc.exists()) {
    return userDoc.data().stripeCustomerId;
  }

  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email: email || undefined,
    metadata: {
      firebaseUID: userId,
    },
  });

  // Save the customer ID in Firestore
  await setDoc(userRef, {
    stripeCustomerId: customer.id,
    email: email,
  });

  return customer.id;
};

export const createCheckoutSession = async ({ priceId, userId, credits }: CreateCheckoutSessionParams) => {
  const customerId = await createOrRetrieveCustomer(userId, auth.currentUser?.email);

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
    metadata: {
      userId,
      credits,
    },
  });

  return session;
};

export const createCustomerPortalSession = async ({ customerId, returnUrl }: CustomerPortalParams) => {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session;
};

export const updateUserCredits = async (userId: string, credits: number) => {
  const userCreditsRef = doc(db, 'user_credits', userId);

  try {
    await runTransaction(db, async (transaction) => {
      const userCreditsDoc = await transaction.get(userCreditsRef);

      if (!userCreditsDoc.exists()) {
        transaction.set(userCreditsRef, {
          balance: credits,
          lastUpdated: new Date(),
        });
      } else {
        transaction.update(userCreditsRef, {
          balance: increment(credits),
          lastUpdated: new Date(),
        });
      }
    });

    return true;
  } catch (error) {
    console.error('Error updating user credits:', error);
    return false;
  }
}; 