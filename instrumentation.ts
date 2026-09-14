/**
 * Next.js instrumentation — starts BullMQ workers when Redis is configured.
 * Outbound/webhook still have inline fallbacks when Redis is unavailable.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'edge') {
    return;
  }

  if (process.env.NODE_ENV === 'test') {
    return;
  }

  const { isRedisAvailable } = await import('@/lib/queue/redis');
  if (!isRedisAvailable()) {
    return;
  }

  try {
    const { createOutboundWorker } = await import('@/lib/queue/outboundWorker');
    const outbound = createOutboundWorker();
    if (outbound) {
      console.log('[Instrumentation] Outbound WhatsApp worker started');
    }
  } catch (err) {
    console.warn('[Instrumentation] Could not start outbound worker:', err);
  }

  try {
    const { createWebhookWorker } = await import('@/lib/queue/webhookWorker');
    const webhook = createWebhookWorker();
    if (webhook) {
      console.log('[Instrumentation] Webhook worker started');
    }
  } catch (err) {
    console.warn('[Instrumentation] Could not start webhook worker:', err);
  }
}
