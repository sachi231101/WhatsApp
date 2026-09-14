/**
 * Server-only helpers for development WhatsApp env detection.
 * Keep out of 'use server' modules so route handlers can import freely.
 * Never expose secret values.
 */

export function isWhatsAppDevConfigAvailable(): boolean {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
  return Boolean(
    token &&
      token !== 'your-whatsapp-cloud-api-access-token' &&
      phoneId &&
      phoneId !== 'your-whatsapp-phone-number-id' &&
      wabaId &&
      wabaId !== 'your-whatsapp-business-account-id',
  );
}
