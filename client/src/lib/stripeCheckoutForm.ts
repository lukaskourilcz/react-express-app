// Load the preview directly from Stripe, on the checkout page after consent.
// No card data, client secrets or Stripe instances go into app storage/logs.
export const CHECKOUT_APPEARANCE = {
  theme: 'stripe', labels: 'auto', inputs: 'spaced',
  variables: {
    borderRadius: '4px', colorBackground: '#ffffff', colorDanger: '#df1b41',
    colorPrimary: '#0570de', colorSuccess: '#00c853', colorText: '#30313d',
    fontFamily: 'Roboto', fontSizeBase: '16px', spacingUnit: '4px',
  },
} as const;

export interface CheckoutView {
  mount(selector: string): void;
  destroy(): void;
}
export interface CheckoutForm extends CheckoutView {
  on(event: 'confirm', callback: (event: unknown) => void): void;
}
interface CheckoutActions {
  confirm(options: { formConfirmEvent: unknown }): Promise<{ type?: string; error?: { message?: string } } | void>;
}
export interface CheckoutSdk {
  createForm(options: { layout: 'expanded' }): CheckoutForm;
  loadActions(): Promise<{ type: 'success'; actions: CheckoutActions } | { type: 'error'; error: { message?: string } }>;
}
interface StripeFormClient {
  initCheckoutFormSdk(options: { clientSecret: string; appearance: typeof CHECKOUT_APPEARANCE }): CheckoutSdk;
  initEmbeddedCheckout(options: { clientSecret: string }): Promise<CheckoutView>;
}
type StripeFactory = (key: string, options: { betas: string[] }) => StripeFormClient;
declare global { interface Window { Stripe?: StripeFactory } }

let loading: Promise<void> | undefined;
function loadStripeJs(): Promise<void> {
  if (window.Stripe) return Promise.resolve();
  if (loading) return loading;
  loading = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://js.stripe.com/dahlia/stripe.js';
    script.async = true;
    const timer = window.setTimeout(() => finish(new Error('Stripe did not load. Check your connection and try again.')), 15000);
    function finish(error?: Error) {
      clearTimeout(timer);
      script.onload = null;
      script.onerror = null;
      if (error) { script.remove(); reject(error); } else resolve();
    }
    script.onload = () => finish(window.Stripe ? undefined : new Error('Stripe Checkout is unavailable. Please try again.'));
    script.onerror = () => finish(new Error('Stripe did not load. Check your connection and try again.'));
    document.head.append(script);
  }).catch((error: unknown) => { loading = undefined; throw error; });
  return loading;
}

export async function loadCheckoutStripe(): Promise<StripeFormClient> {
  const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY?.trim();
  if (!key || !/^pk_(test|live)_/.test(key)) throw new Error('Premium checkout is not configured yet.');
  await loadStripeJs();
  const stripe = window.Stripe!(key, { betas: ['custom_checkout_payment_form_1'] });
  return stripe;
}
