require('dotenv').config({ path: '.env.local' });
const Stripe = require('stripe');

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-02-24.acacia',
});

// Credit package configurations (copied from config.ts)
const CREDIT_PACKAGES = [
  {
    id: 'basic',
    name: 'Basic',
    credits: 100,
    price: 5.00,
  },
  {
    id: 'pro',
    name: 'Professional',
    credits: 500,
    price: 20.00,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    credits: 2000,
    price: 50.00,
  },
] as const;

async function createProducts() {
  try {
    console.log('Creating Stripe products and prices...');

    for (const pkg of CREDIT_PACKAGES) {
      // Create or update product
      const product = await stripe.products.create({
        name: pkg.name,
        description: `${pkg.credits} PDF conversion credits`,
        metadata: {
          credits: pkg.credits.toString(),
        },
      });

      console.log(`Created product: ${product.name}`);

      // Create price for the product
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: pkg.price * 100, // Convert to cents
        currency: 'usd',
      });

      console.log(`Created price for ${pkg.name}: $${pkg.price}`);
      console.log(`Price ID: ${price.id}`);
      console.log('------------------------');
    }

    console.log('Setup completed successfully!');
  } catch (error) {
    console.error('Error setting up Stripe products:', error);
  }
}

createProducts(); 