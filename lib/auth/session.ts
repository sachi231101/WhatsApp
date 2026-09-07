import { cookies } from 'next/headers';
import type { NextRequest, NextResponse } from 'next/server';
import {
  encrypt,
  serializeEncrypted,
  deserializeAndDecrypt,
} from '@/lib/crypto/encryption';

export const SESSION_COOKIE_NAME = 'wazzapp_session';
export const DEFAULT_SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

export interface AuthSessionUser {
  userId: string;
  email: string;
  name: string;
  role: 'admin' | 'client';
  isSuperAdmin: boolean;
  tenantId?: string;
  workspaceId?: string;
  companyName?: string;
  exp: number;
}

/**
 * Creates an encrypted session token from user info
 */
export function createSessionToken(
  user: Omit<AuthSessionUser, 'exp'>,
  maxAgeSeconds = DEFAULT_SESSION_MAX_AGE,
): string {
  const payload: AuthSessionUser = {
    ...user,
    exp: Math.floor(Date.now() / 1000) + maxAgeSeconds,
  };
  const json = JSON.stringify(payload);
  const encrypted = encrypt(json);
  return serializeEncrypted(encrypted);
}

/**
 * Decrypts and validates an encrypted session token.
 * Returns null if token is invalid or expired.
 */
export function verifySessionToken(token: string | undefined | null): AuthSessionUser | null {
  if (!token) return null;
  try {
    const json = deserializeAndDecrypt(token);
    const parsed = JSON.parse(json) as AuthSessionUser;
    if (!parsed.userId || !parsed.email || !parsed.role || !parsed.exp) {
      return null;
    }
    const now = Math.floor(Date.now() / 1000);
    if (parsed.exp < now) {
      return null; // Expired
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Retrieves the current session user from cookies in Next.js Server Components or Route Handlers
 */
export async function getSessionUser(): Promise<AuthSessionUser | null> {
  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(SESSION_COOKIE_NAME);
    if (!cookie?.value) return null;
    return verifySessionToken(cookie.value);
  } catch {
    return null;
  }
}

/**
 * Helper to inspect session user from NextRequest (Middleware or Route Handler)
 */
export function getSessionFromRequest(request: NextRequest): AuthSessionUser | null {
  const cookie = request.cookies.get(SESSION_COOKIE_NAME);
  if (!cookie?.value) return null;
  return verifySessionToken(cookie.value);
}

/**
 * Attaches the session cookie to a NextResponse
 */
export function applySessionCookie(
  response: NextResponse,
  token: string,
  role: 'admin' | 'client' = 'client',
  maxAge = DEFAULT_SESSION_MAX_AGE,
): void {
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge,
  });

  response.cookies.set('wazzapp_role', role, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge,
  });
}

/**
 * Clears the session cookie on a NextResponse
 */
export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  });

  response.cookies.set('wazzapp_role', '', {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  });
}
