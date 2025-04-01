import { stripe } from '../lib/stripe/config';
import { updateUserCredits } from '../lib/stripe/client';

async function testWebhook() {
  try {
    // Create a test customer
    const customer = await stripe.customers.create({
      email: 'test@example.com',
      metadata: {
        firebaseUID: 'test-user-id',
      },
    });

    // Create a test payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 1000, // $10.00
      currency: 'usd',
      customer: customer.id,
      payment_method_types: ['card'],
      metadata: {
        userId: 'test-user-id',
        credits: '100',
      },
    });

    // Confirm the payment intent with a test card
    await stripe.paymentIntents.confirm(paymentIntent.id, {
      payment_method: 'pm_card_visa',
    });

    console.log('Test completed successfully!');
    console.log('Customer ID:', customer.id);
    console.log('Payment Intent ID:', paymentIntent.id);

    // Clean up
    await stripe.customers.del(customer.id);
  } catch (error) {
    console.error('Error running test:', error);
  }
}

// Only run if called directly
if (require.main === module) {
  testWebhook();
} 