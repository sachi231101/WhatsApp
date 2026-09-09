/**
 * Phone number normalization and validation utilities for multi-tenant Contacts.
 * Adheres to ITU-T E.164 principles for identity matching and deduplication.
 */

/**
 * Normalizes an arbitrary phone string into a canonical digit sequence.
 * Strips whitespace, dashes, parentheses, dots, and optional leading '+'.
 * Ensures that '+1 (555) 019-2831', '15550192831', and '+15550192831'
 * resolve to the exact same normalized value '15550192831'.
 */
export function normalizePhoneNumber(rawPhone: string | undefined | null): string {
  if (!rawPhone || typeof rawPhone !== 'string') return '';
  // Strip all non-digit characters
  return rawPhone.replace(/\D/g, '');
}

/**
 * Validates whether a given phone number has a realistic length for E.164
 * (standard E.164 recommends 7 to 15 digits).
 */
export function isValidPhoneNumber(rawPhone: string | undefined | null): boolean {
  const normalized = normalizePhoneNumber(rawPhone);
  return normalized.length >= 7 && normalized.length <= 15;
}

/**
 * Formats a normalized phone number for user-facing display.
 * Adds a leading '+' and groups digits nicely if standard country codes match.
 */
export function formatDisplayPhoneNumber(rawPhone: string | undefined | null): string {
  const normalized = normalizePhoneNumber(rawPhone);
  if (!normalized) return '';

  // E.g. US/Canada (11 digits starting with 1) -> +1 (XXX) XXX-XXXX
  if (normalized.length === 11 && normalized.startsWith('1')) {
    const area = normalized.slice(1, 4);
    const mid = normalized.slice(4, 7);
    const end = normalized.slice(7);
    return `+1 (${area}) ${mid}-${end}`;
  }

  // E.g. India (12 digits starting with 91) -> +91 XXXXX XXXXX
  if (normalized.length === 12 && normalized.startsWith('91')) {
    const p1 = normalized.slice(2, 7);
    const p2 = normalized.slice(7);
    return `+91 ${p1} ${p2}`;
  }

  // E.g. UK (12 digits starting with 44) -> +44 XXXX XXXXXX
  if (normalized.length >= 11 && normalized.startsWith('44')) {
    return `+44 ${normalized.slice(2, 6)} ${normalized.slice(6)}`;
  }

  // Fallback: + prefixed
  return `+${normalized}`;
}

/**
 * Simple email validator conforming to standard web email constraints.
 */
export function isValidEmail(email: string | undefined | null): boolean {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  if (trimmed.length > 254) return false;
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/;
  return emailRegex.test(trimmed);
}
