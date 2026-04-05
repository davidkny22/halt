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

export const PRICE_IDS = {
  pro: {
    firstAgent: "price_1TB4gUL6FFGNUHLlm9r7MSfH", // $5/mo
    additionalAgent: "price_1TB4gaL6FFGNUHLlQfaWbajT", // $3/mo
  },
  team: {
    base: "price_1TB4grL6FFGNUHLliKe6W6cR", // $29/mo (10 agents included)
    additionalAgent: "price_1TB4gsL6FFGNUHLlIDamGisi", // $2/mo
  },
  // Enterprise: custom pricing (contact sales)
};

export async function createCheckoutSession(
  userId: string,
  email: string,
  plan: "pro" | "team" = "pro",
  customerId?: string
): Promise<string | null> {
  const stripe = getStripe();
  if (!stripe) return null;

  const priceId = plan === "team" ? PRICE_IDS.team.base : PRICE_IDS.pro.firstAgent;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId || undefined,
    customer_email: customerId ? undefined : email,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: "https://clawnitor.io/settings?billing=success",
    cancel_url: "https://clawnitor.io/settings?billing=cancel",
    metadata: { userId, plan },
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
