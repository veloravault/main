// Client-side helper for loading Razorpay's Checkout script and opening it.
// No SDK — Razorpay Checkout is a single script + a global constructor.

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => { open: () => void };
  }
}

interface RazorpayCheckoutOptions {
  key: string;
  subscription_id: string;
  name: string;
  description?: string;
  theme?: { color?: string };
  handler: (response: { razorpay_payment_id: string; razorpay_subscription_id: string; razorpay_signature: string }) => void;
  modal?: { ondismiss?: () => void };
}

const CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

let loadPromise: Promise<void> | null = null;

function loadCheckoutScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  if (loadPromise) return loadPromise;
  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = CHECKOUT_SRC;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load the payment form. Check your connection and try again."));
    document.head.appendChild(script);
  });
  return loadPromise;
}

export async function openSubscriptionCheckout(options: {
  keyId: string;
  subscriptionId: string;
  onSuccess: (response: { razorpay_payment_id: string; razorpay_subscription_id: string; razorpay_signature: string }) => void;
  onDismiss?: () => void;
}): Promise<void> {
  await loadCheckoutScript();
  if (!window.Razorpay) throw new Error("Payment form failed to load.");
  const checkout = new window.Razorpay({
    key: options.keyId,
    subscription_id: options.subscriptionId,
    name: "Velora Vault",
    description: "Subscription",
    theme: { color: "#3b6fe0" },
    handler: options.onSuccess,
    modal: { ondismiss: options.onDismiss },
  });
  checkout.open();
}
