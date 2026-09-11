import { NextResponse, type NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { encrypt, decrypt } from '@/lib/crypto/encryption';
import { logAdminAudit, AUDIT_ACTIONS } from '@/lib/services/audit/adminAudit';

export const dynamic = 'force-dynamic';
function requireAdmin(u: any) { if (!u || (u.role !== 'admin' && !u.isSuperAdmin)) throw new Error('ADMIN_REQUIRED'); }
function mask(v: string | null | undefined) {
  if (!v) return null;
  if (v.length <= 4) return '••••';
  return v.slice(0, 4) + '••••••••' + v.slice(-4);
}

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  try { requireAdmin(user); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  try {
    const { rows } = await sql`SELECT id,app_id,embedded_signup_config_id,webhook_url,api_version,environment,is_active,last_verified_at,created_at,updated_at,system_user_id FROM meta_configurations ORDER BY created_at DESC LIMIT 1`;
    let config = rows[0] || null;
    // also include env fallback
    const envFallback = {
      appId: process.env.FB_APP_ID || null,
      verifyToken: process.env.FB_VERIFY_TOKEN ? mask(process.env.FB_VERIFY_TOKEN) : null,
      apiVersion: process.env.FB_GRAPH_API_VERSION || 'v22.0',
      webhookUrl: process.env.APP_BASE_URL ? `${process.env.APP_BASE_URL}/api/webhooks` : null,
    };
    // For stored secrets, we never return raw - only masked indicator
    if (config) {
      config = {
        ...config,
        appSecretMasked: config.encrypted_app_secret ? '••••••••••••' : null,
        verifyTokenMasked: config.encrypted_verify_token ? '••••••••••••' : null,
        systemUserTokenMasked: config.encrypted_system_user_token ? '••••••••••••' : null,
      };
      delete config.encrypted_app_secret; delete config.encrypted_verify_token; delete config.encrypted_system_user_token;
    }
    return NextResponse.json({ status: 'ok', data: { stored: config, env: envFallback } });
  } catch (e: any) {
    return NextResponse.json({ status: 'ok', data: { stored: null, env: { appId: process.env.FB_APP_ID || null, apiVersion: 'v22.0' } } });
  }
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  try { requireAdmin(user); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  const body = await request.json();
  const { appId, appSecret, embeddedSignupConfigId, webhookUrl, verifyToken, systemUserId, systemUserToken, apiVersion, environment } = body;

  try {
    let encryptedAppSecret: string | null = null, appSecretIv: string | null = null, appSecretTag: string | null = null;
    if (appSecret) {
      const enc = encrypt(appSecret);
      encryptedAppSecret = enc.ciphertext; appSecretIv = enc.iv; appSecretTag = enc.tag;
    }
    let encryptedVerify: string | null = null, verifyIv: string | null = null, verifyTag: string | null = null;
    if (verifyToken) {
      const enc = encrypt(verifyToken);
      encryptedVerify = enc.ciphertext; verifyIv = enc.iv; verifyTag = enc.tag;
    }
    let encSys: string | null = null, sysIv: string | null = null, sysTag: string | null = null;
    if (systemUserToken) {
      const enc = encrypt(systemUserToken);
      encSys = enc.ciphertext; sysIv = enc.iv; sysTag = enc.tag;
    }

    const { rows: existing } = await sql`SELECT id FROM meta_configurations LIMIT 1`;
    let result: any;
    if (existing.length) {
      const id = existing[0].id;
      // Only update fields that were provided (secrets only if new value given)
      await sql`
        UPDATE meta_configurations SET
          app_id = COALESCE(${appId || null}, app_id),
          encrypted_app_secret = COALESCE(${encryptedAppSecret}, encrypted_app_secret),
          app_secret_iv = COALESCE(${appSecretIv}, app_secret_iv),
          app_secret_tag = COALESCE(${appSecretTag}, app_secret_tag),
          embedded_signup_config_id = COALESCE(${embeddedSignupConfigId || null}, embedded_signup_config_id),
          webhook_url = COALESCE(${webhookUrl || null}, webhook_url),
          encrypted_verify_token = COALESCE(${encryptedVerify}, encrypted_verify_token),
          verify_token_iv = COALESCE(${verifyIv}, verify_token_iv),
          verify_token_tag = COALESCE(${verifyTag}, verify_token_tag),
          system_user_id = COALESCE(${systemUserId || null}, system_user_id),
          encrypted_system_user_token = COALESCE(${encSys}, encrypted_system_user_token),
          system_user_token_iv = COALESCE(${sysIv}, system_user_token_iv),
          system_user_token_tag = COALESCE(${sysTag}, system_user_token_tag),
          api_version = COALESCE(${apiVersion || null}, api_version),
          environment = COALESCE(${environment || null}, environment),
          updated_at = now()
        WHERE id=${id}
      `;
      const { rows } = await sql`SELECT id,app_id,api_version,environment,updated_at FROM meta_configurations WHERE id=${id} LIMIT 1`;
      result = rows[0];
    } else {
      const { rows } = await sql`
        INSERT INTO meta_configurations (app_id, encrypted_app_secret, app_secret_iv, app_secret_tag, embedded_signup_config_id, webhook_url, encrypted_verify_token, verify_token_iv, verify_token_tag, system_user_id, encrypted_system_user_token, system_user_token_iv, system_user_token_tag, api_version, environment)
        VALUES (${appId || null}, ${encryptedAppSecret}, ${appSecretIv}, ${appSecretTag}, ${embeddedSignupConfigId || null}, ${webhookUrl || null}, ${encryptedVerify}, ${verifyIv}, ${verifyTag}, ${systemUserId || null}, ${encSys}, ${sysIv}, ${sysTag}, ${apiVersion || 'v22.0'}, ${environment || 'production'})
        RETURNING id,app_id,api_version,environment,created_at
      `;
      result = rows[0];
    }
    await logAdminAudit({ adminUserId: user!.userId, adminEmail: user!.email, action: AUDIT_ACTIONS.META_CONFIG_UPDATE, entityType: 'meta_configuration', entityId: result.id, newValues: { appId, apiVersion }, reason: body.reason }, request);
    return NextResponse.json({ status: 'ok', data: result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
