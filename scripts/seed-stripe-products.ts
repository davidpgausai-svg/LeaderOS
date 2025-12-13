import { getUncachableStripeClient } from '../server/stripeClient';

interface PlanConfig {
  name: string;
  metadata: { leaderOsPlan: string };
  monthlyPrice: number;
  annualPrice?: number;
  description: string;
}

const PLANS: PlanConfig[] = [
  {
    name: 'Starter',
    metadata: { leaderOsPlan: 'starter' },
    monthlyPrice: 100,
    description: '1 Strategic Priority, 4 Projects, 1 User',
  },
  {
    name: 'LeaderPro',
    metadata: { leaderOsPlan: 'leaderpro' },
    monthlyPrice: 1200,
    annualPrice: 12000,
    description: 'Unlimited Priorities & Projects, 1 User, SME Tagging',
  },
  {
    name: 'Team',
    metadata: { leaderOsPlan: 'team' },
    monthlyPrice: 2200,
    annualPrice: 22000,
    description: 'Unlimited Everything, 6 Users Included, Team Features',
  },
  {
    name: 'Team Extra Seat',
    metadata: { leaderOsPlan: 'team_seat' },
    monthlyPrice: 600,
    annualPrice: 6000,
    description: 'Additional user seat for Team plan',
  },
];

async function seedStripeProducts() {
  console.log('Starting Stripe products seed...');
  
  const stripe = await getUncachableStripeClient();
  
  for (const plan of PLANS) {
    console.log(`\nProcessing ${plan.name}...`);
    
    const existingProducts = await stripe.products.search({
      query: `name:'${plan.name}'`,
    });
    
    let product;
    if (existingProducts.data.length > 0) {
      product = existingProducts.data[0];
      console.log(`  Product already exists: ${product.id}`);
    } else {
      product = await stripe.products.create({
        name: plan.name,
        description: plan.description,
        metadata: plan.metadata,
      });
      console.log(`  Created product: ${product.id}`);
    }
    
    const existingPrices = await stripe.prices.list({
      product: product.id,
      active: true,
    });
    
    const hasMonthlyPrice = existingPrices.data.some(
      p => p.recurring?.interval === 'month' && p.unit_amount === plan.monthlyPrice
    );
    
    if (!hasMonthlyPrice) {
      const monthlyPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: plan.monthlyPrice,
        currency: 'usd',
        recurring: { interval: 'month' },
        metadata: plan.metadata,
      });
      console.log(`  Created monthly price: ${monthlyPrice.id} ($${plan.monthlyPrice / 100}/mo)`);
    } else {
      console.log(`  Monthly price already exists`);
    }
    
    if (plan.annualPrice) {
      const hasAnnualPrice = existingPrices.data.some(
        p => p.recurring?.interval === 'year' && p.unit_amount === plan.annualPrice
      );
      
      if (!hasAnnualPrice) {
        const annualPrice = await stripe.prices.create({
          product: product.id,
          unit_amount: plan.annualPrice,
          currency: 'usd',
          recurring: { interval: 'year' },
          metadata: plan.metadata,
        });
        console.log(`  Created annual price: ${annualPrice.id} ($${plan.annualPrice / 100}/yr)`);
      } else {
        console.log(`  Annual price already exists`);
      }
    }
  }
  
  console.log('\n✅ Stripe products seed complete!');
  console.log('\nCreated products and prices:');
  
  for (const plan of PLANS) {
    const products = await stripe.products.search({
      query: `name:'${plan.name}'`,
    });
    
    if (products.data[0]) {
      const prices = await stripe.prices.list({
        product: products.data[0].id,
        active: true,
      });
      
      console.log(`\n${plan.name} (${products.data[0].id}):`);
      for (const price of prices.data) {
        const interval = price.recurring?.interval || 'one-time';
        console.log(`  - ${price.id}: $${price.unit_amount! / 100}/${interval}`);
      }
    }
  }
}

seedStripeProducts().catch(console.error);
