import Stripe from 'stripe';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local file
dotenv.config({ path: resolve(__dirname, '../.env.local') });

const SUBSCRIPTION_TIERS = [
  {
    id: 'standard',
    name: 'Standard',
    description: 'Enhanced conversion for regular users',
    price: 10,
    pagesPerMonth: 1000,
  },
  {
    id: 'premium',
    name: 'Premium',
    description: 'Professional conversion for power users',
    price: 20,
    pagesPerMonth: 2000,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Maximum conversion power for large organizations',
    price: 100,
    pagesPerMonth: 10000,
  }
];

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-02-24.acacia',
});

async function createSubscriptionProducts() {
  try {
    console.log('Creating Stripe subscription products and prices...');

    for (const tier of SUBSCRIPTION_TIERS) {
      // Create or update product
      const product = await stripe.products.create({
        name: tier.name,
        description: tier.description,
        metadata: {
          pagesPerMonth: tier.pagesPerMonth.toString(),
        },
      });

      console.log(`Created product: ${product.name}`);

      // Create recurring price for the product
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: tier.price * 100, // Convert to cents
        currency: 'usd',
        recurring: {
          interval: 'month'
        },
        metadata: {
          tierId: tier.id
        }
      });

      console.log(`Created subscription price for ${tier.name}: $${tier.price}/month`);
      console.log(`Price ID: ${price.id}`);
      console.log('------------------------');
    }

    console.log('Setup completed successfully!');
  } catch (error) {
    console.error('Error setting up Stripe products:', error);
  }
}

// Run the function
createSubscriptionProducts(); 