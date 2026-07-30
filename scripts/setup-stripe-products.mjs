import Stripe from 'stripe';

const stripeKey = process.env.STRIPE_SECRET_KEY;
if (!stripeKey) {
  console.error('Missing STRIPE_SECRET_KEY in env. Export it before running this script.');
  process.exit(1);
}
const stripe = new Stripe(stripeKey);

async function setup() {
  console.log('Creating Stripe products and prices...\n');

  // Intro Class
  const intro = await stripe.products.create({ name: 'Maningo Method — Intro Class' });
  const introPrice = await stripe.prices.create({
    product: intro.id,
    unit_amount: 2000, // $20
    currency: 'usd',
  });
  console.log(`Intro Class: ${introPrice.id} ($20)`);

  // Single Class (Drop-in)
  const single = await stripe.products.create({ name: 'Maningo Method — Single Class' });
  const singlePrice = await stripe.prices.create({
    product: single.id,
    unit_amount: 4000, // $40
    currency: 'usd',
  });
  console.log(`Single Class: ${singlePrice.id} ($40)`);

  // 4-Pack
  const pack4 = await stripe.products.create({ name: 'Maningo Method — 4-Class Pack' });
  const pack4Price = await stripe.prices.create({
    product: pack4.id,
    unit_amount: 14000, // $140
    currency: 'usd',
  });
  console.log(`4-Pack: ${pack4Price.id} ($140)`);

  // 8-Pack
  const pack8 = await stripe.products.create({ name: 'Maningo Method — 8-Class Pack' });
  const pack8Price = await stripe.prices.create({
    product: pack8.id,
    unit_amount: 24000, // $240
    currency: 'usd',
  });
  console.log(`8-Pack: ${pack8Price.id} ($240)`);

  // 12-Pack
  const pack12 = await stripe.products.create({ name: 'Maningo Method — 12-Class Pack' });
  const pack12Price = await stripe.prices.create({
    product: pack12.id,
    unit_amount: 32000, // $320
    currency: 'usd',
  });
  console.log(`12-Pack: ${pack12Price.id} ($320)`);

  console.log('\n--- Add these to your .env ---');
  console.log(`STRIPE_INTRO_PRICE_ID=${introPrice.id}`);
  console.log(`STRIPE_DROPIN_PRICE_ID=${singlePrice.id}`);
  console.log(`STRIPE_4PACK_PRICE_ID=${pack4Price.id}`);
  console.log(`STRIPE_8PACK_PRICE_ID=${pack8Price.id}`);
  console.log(`STRIPE_12PACK_PRICE_ID=${pack12Price.id}`);
}

setup().catch(console.error);
