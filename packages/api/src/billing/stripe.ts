import Stripe from "stripe";
import { getConfig } from "../config.js";

let _stripe: Stripe | undefined;

export function getStripe(): Stripe | null {
  const config = getConfig();
  if (!config.STRIPE_SECRET_KEY) return null;
  if (!_stripe) {
    _stripe = new Stripe(config.STRIPE_SECRET_KEY);
  }
  return _stripe;
}

// Price IDs would be configured in Stripe Dashboard
// These are placeholders — replace with real IDs after Stripe setup
const PRICE_IDS = {
  firstAgent: "price_first_agent_monthly", // $5/mo
  additionalAgent: "price_additional_agent_monthly", // $3/mo
};

export async function createCheckoutSession(
  userId: string,
  email: string,
  customerId?: string
): Promise<string | null> {
  const stripe = getStripe();
  if (!stripe) return null;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId || undefined,
    customer_email: customerId ? undefined : email,
    line_items: [
      { price: PRICE_IDS.firstAgent, quantity: 1 },
    ],
    success_url: "https://clawnitor.io/settings?billing=success",
    cancel_url: "https://clawnitor.io/settings?billing=cancel",
    metadata: { userId },
  });

  return session.url;
}

export async function createPortalSession(
  customerId: string
): Promise<string | null> {
  const stripe = getStripe();
  if (!stripe) return null;

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: "https://clawnitor.io/settings",
  });

  return session.url;
}
