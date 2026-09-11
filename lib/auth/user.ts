import { auth0 } from '@/lib/auth0';
import { sql } from '@/lib/db';
import { ensureCoreTables, ensureCoreTablesCached } from './context';

export interface UserRecord {
  id: string;
  auth0UserId: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  status: string;
  role?: string;
  isSuperAdmin?: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
}

export class AuthenticationRequiredError extends Error {
  statusCode: number = 401;
  code: string = 'UNAUTHENTICATED';

  constructor(message = 'Authentication required. Please sign in.') {
    super(message);
    this.name = 'AuthenticationRequiredError';
  }
}

let coreTablesChecked = false;

async function checkTables() {
  if (coreTablesChecked) return;
  try {
    await ensureCoreTablesCached();
    coreTablesChecked = true;
  } catch (err) {
    console.warn('checkTables warning:', err);
    try {
      await ensureCoreTables();
      coreTablesChecked = true;
    } catch (err2) {
      console.warn('checkTables fallback warning:', err2);
    }
  }
}

/**
 * Synchronizes an authenticated Auth0 user into the local users table.
 * Ensures auth0_user_id is unique and does not create duplicate user records.
 * Updates last_login_at on each login.
 */
export async function syncAuth0User(identity: {
  sub: string;
  email: string;
  name?: string | null;
  picture?: string | null;
}): Promise<UserRecord> {
  await checkTables();

  const auth0UserId = identity.sub;
  const cleanEmail = identity.email.trim().toLowerCase();
  const userName = identity.name?.trim() || null;
  const avatarUrl = identity.picture || null;

  // 1. Try finding existing user by auth0_user_id, auth0_sub, or unique email
  const { rows: existingRows } = await sql`
    SELECT 
      id, 
      COALESCE(auth0_user_id, auth0_sub) as auth0_user_id,
      email, 
      name, 
      avatar_url, 
      status, 
      role, 
      is_super_admin, 
      created_at, 
      updated_at, 
      last_login_at
    FROM users
    WHERE auth0_user_id = ${auth0UserId} 
       OR auth0_sub = ${auth0UserId}
       OR LOWER(email) = ${cleanEmail}
    LIMIT 1
  `;

  if (existingRows.length > 0) {
    const existing = existingRows[0];
    // Update last_login_at and sync profile changes without duplicating
    const { rows: updatedRows } = await sql`
      UPDATE users
      SET 
        auth0_user_id = COALESCE(auth0_user_id, ${auth0UserId}),
        auth0_sub = COALESCE(auth0_sub, ${auth0UserId}),
        name = COALESCE(${userName}, name),
        avatar_url = COALESCE(${avatarUrl}, avatar_url),
        last_login_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${existing.id}
      RETURNING 
        id, 
        COALESCE(auth0_user_id, auth0_sub) as auth0_user_id,
        email, 
        name, 
        avatar_url, 
        status, 
        role, 
        is_super_admin, 
        created_at, 
        updated_at, 
        last_login_at
    `;

    const row = updatedRows[0] || existing;
    return {
      id: row.id,
      auth0UserId: row.auth0_user_id || auth0UserId,
      email: row.email,
      name: row.name,
      avatarUrl: row.avatar_url,
      status: row.status,
      role: row.role,
      isSuperAdmin: Boolean(row.is_super_admin),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastLoginAt: row.last_login_at,
    };
  }

  // 2. Insert new user record
  const { rows: newRows } = await sql`
    INSERT INTO users (
      auth0_user_id,
      auth0_sub,
      email,
      name,
      avatar_url,
      status,
      role,
      last_login_at,
      created_at,
      updated_at
    )
    VALUES (
      ${auth0UserId},
      ${auth0UserId},
      ${cleanEmail},
      ${userName},
      ${avatarUrl},
      'active',
      'client',
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    )
    ON CONFLICT (email) DO UPDATE SET
      auth0_user_id = EXCLUDED.auth0_user_id,
      last_login_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
    RETURNING 
      id, 
      COALESCE(auth0_user_id, auth0_sub) as auth0_user_id,
      email, 
      name, 
      avatar_url, 
      status, 
      role, 
      is_super_admin, 
      created_at, 
      updated_at, 
      last_login_at
  `;

  const created = newRows[0];
  return {
    id: created.id,
    auth0UserId: created.auth0_user_id || auth0UserId,
    email: created.email,
    name: created.name,
    avatarUrl: created.avatar_url,
    status: created.status,
    role: created.role,
    isSuperAdmin: Boolean(created.is_super_admin),
    createdAt: created.created_at,
    updatedAt: created.updated_at,
    lastLoginAt: created.last_login_at,
  };
}

/**
 * Retrieves the currently authenticated local Wazzi user.
 * Returns null if the user is unauthenticated or has an invalid/expired session.
 */
export async function getCurrentUser(): Promise<UserRecord | null> {
  try {
    const session = await auth0.getSession();
    if (!session || !session.user || !session.user.email) {
      return null;
    }

    const sub = session.user.sub || `auth0|${session.user.email}`;
    const email = session.user.email;
    const name = session.user.name || null;
    const picture = session.user.picture || session.user.avatarUrl || null;

    return await syncAuth0User({ sub, email, name, picture });
  } catch (error) {
    console.error('getCurrentUser error:', error);
    return null;
  }
}

/**
 * Requires an authenticated user session.
 * Throws AuthenticationRequiredError (401) if not authenticated.
 */
export async function requireAuthenticatedUser(): Promise<UserRecord> {
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthenticationRequiredError();
  }
  return user;
}
