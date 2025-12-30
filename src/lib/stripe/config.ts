import Stripe from 'stripe';

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
});

// Credit Pack Configuration
export const CREDIT_PACKS = {
  pack_a: {
    id: 'pack_a',
    name: 'Pack A - Starter',
    description: '2 Credits for casual learners',
    price: 9.99,
    credits: 2,
  },
  pack_b: {
    id: 'pack_b',
    name: 'Pack B - Standard',
    description: '5 Credits for dedicated learners',
    price: 19.99,
    credits: 5,
  },
  pack_c: {
    id: 'pack_c',
    name: 'Pack C - Premium',
    description: '15 Credits for serious learners',
    price: 44.99,
    credits: 15,
  },
} as const;

export type CreditPackId = keyof typeof CREDIT_PACKS;

export function getCreditPackById(packId: string) {
  return CREDIT_PACKS[packId as CreditPackId] || null;
}

export function validateCreditPackId(packId: string): packId is CreditPackId {
  return packId in CREDIT_PACKS;
}

export { stripe };
