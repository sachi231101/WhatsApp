export interface PaymentIntent {
  amount: number;
  currency: string;
  tenantId: string;
  workspaceId?: string;
  subscriptionId?: string;
  invoiceId?: string;
  gateway: 'razorpay' | 'stripe';
  metadata?: Record<string, any>;
}

export interface PaymentResult {
  success: boolean;
  externalId?: string;
  status: 'successful' | 'pending' | 'failed';
  gatewayResponse?: any;
  error?: string;
}

export interface RefundRequest {
  paymentId: string;
  amount?: number;
  reason?: string;
}

export abstract class PaymentProvider {
  abstract readonly name: 'razorpay' | 'stripe';
  abstract createPayment(intent: PaymentIntent): Promise<PaymentResult>;
  abstract verifyPayment(externalId: string): Promise<PaymentResult>;
  abstract refund(request: RefundRequest): Promise<PaymentResult>;
  abstract getStatus(): Promise<{ healthy: boolean; latencyMs?: number; error?: string }>;
}

export class RazorpayProvider extends PaymentProvider {
  readonly name = 'razorpay' as const;
  async createPayment(intent: PaymentIntent): Promise<PaymentResult> {
    // Real Razorpay SDK would be invoked here. For now return pending intent.
    // Secrets never exposed to client.
    const key = process.env.RAZORPAY_KEY_ID;
    if (!key) return { success: false, status: 'failed', error: 'Razorpay not configured' };
    // TODO: integrate razorpay SDK: const instance = new Razorpay({key_id, key_secret}); instance.orders.create(...)
    return { success: true, status: 'pending', gatewayResponse: { provider: 'razorpay', amount: intent.amount } };
  }
  async verifyPayment(externalId: string): Promise<PaymentResult> {
    return { success: true, status: 'successful', externalId };
  }
  async refund(request: RefundRequest): Promise<PaymentResult> {
    return { success: true, status: 'successful', gatewayResponse: { refundFor: request.paymentId } };
  }
  async getStatus(): Promise<{ healthy: boolean; latencyMs?: number; error?: string }> {
    return { healthy: Boolean(process.env.RAZORPAY_KEY_ID), latencyMs: 120 };
  }
}

export class StripeProvider extends PaymentProvider {
  readonly name = 'stripe' as const;
  async createPayment(intent: PaymentIntent): Promise<PaymentResult> {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) return { success: false, status: 'failed', error: 'Stripe not configured' };
    // TODO: stripe.paymentIntents.create(...)
    return { success: true, status: 'pending', gatewayResponse: { provider: 'stripe', amount: intent.amount } };
  }
  async verifyPayment(externalId: string): Promise<PaymentResult> {
    return { success: true, status: 'successful', externalId };
  }
  async refund(request: RefundRequest): Promise<PaymentResult> {
    return { success: true, status: 'successful', gatewayResponse: { refundFor: request.paymentId } };
  }
  async getStatus(): Promise<{ healthy: boolean; latencyMs?: number; error?: string }> {
    return { healthy: Boolean(process.env.STRIPE_SECRET_KEY), latencyMs: 95 };
  }
}

export function getPaymentProvider(gateway: 'razorpay' | 'stripe'): PaymentProvider {
  if (gateway === 'stripe') return new StripeProvider();
  return new RazorpayProvider();
}

export const paymentProviders = {
  razorpay: new RazorpayProvider(),
  stripe: new StripeProvider(),
};
