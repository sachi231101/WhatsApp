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
  const { action, appId, appSecret, embeddedSignupConfigId, webhookUrl, verifyToken, systemUserId, systemUserToken, apiVersion, environment } = body;

  try {
    const { rows: existing } = await sql`SELECT id, app_id, encrypted_app_secret, app_secret_iv, app_secret_tag, api_version FROM meta_configurations LIMIT 1`;

    // Action 1: Test Connection
    if (action === 'test') {
      let testAppId = appId || existing[0]?.app_id || process.env.FB_APP_ID;
      let testAppSecret = appSecret;

      if (!testAppSecret && existing.length && existing[0].encrypted_app_secret && existing[0].app_secret_iv && existing[0].app_secret_tag) {
        try {
          testAppSecret = decrypt({
            ciphertext: existing[0].encrypted_app_secret,
            iv: existing[0].app_secret_iv,
            tag: existing[0].app_secret_tag,
          });
        } catch {}
      }

      if (!testAppSecret) {
        testAppSecret = process.env.FB_APP_SECRET;
      }

      const ver = apiVersion || existing[0]?.api_version || process.env.FB_GRAPH_API_VERSION || 'v22.0';

      if (!testAppId || !testAppSecret) {
        return NextResponse.json({ error: 'App ID and App Secret are required to test the connection.' }, { status: 400 });
      }

      const appToken = `${testAppId}|${testAppSecret}`;
      const url = `https://graph.facebook.com/${ver}/${testAppId}?fields=id,name,app_domains,app_type,link&access_token=${encodeURIComponent(appToken)}`;
      
      const metaRes = await fetch(url);
      const metaData = await metaRes.json();

      if (metaData.error) {
        return NextResponse.json({
          status: 'error',
          error: metaData.error.message || 'Meta API returned an error',
          details: metaData.error,
        }, { status: 400 });
      }

      // Mark verified in DB if config exists
      if (existing.length) {
        await sql`UPDATE meta_configurations SET last_verified_at = now(), is_active = true WHERE id = ${existing[0].id}`;
      }

      await logAdminAudit({
        adminUserId: user!.userId,
        adminEmail: user!.email,
        action: AUDIT_ACTIONS.META_CONFIG_UPDATE,
        entityType: 'meta_configuration',
        entityId: testAppId,
        newValues: { test: 'success', appName: metaData.name },
        reason: 'Connection test executed',
      }, request);

      return NextResponse.json({
        status: 'ok',
        data: {
          appId: metaData.id,
          appName: metaData.name,
          appType: metaData.app_type,
          link: metaData.link,
          apiVersion: ver,
          verifiedAt: new Date().toISOString(),
        },
      });
    }

    // Action 2: Sync from Environment Variables
    if (action === 'sync_env') {
      const envAppId = process.env.FB_APP_ID;
      const envAppSecret = process.env.FB_APP_SECRET;
      const envVerifyToken = process.env.FB_VERIFY_TOKEN;
      const envApiVersion = process.env.FB_GRAPH_API_VERSION || 'v22.0';
      const envWebhookUrl = process.env.APP_BASE_URL ? `${process.env.APP_BASE_URL}/api/webhooks` : null;

      if (!envAppId || !envAppSecret) {
        return NextResponse.json({ error: 'FB_APP_ID or FB_APP_SECRET not found in environment.' }, { status: 400 });
      }

      const encSecret = encrypt(envAppSecret);
      const encVerify = envVerifyToken ? encrypt(envVerifyToken) : null;

      if (existing.length) {
        await sql`
          UPDATE meta_configurations SET
            app_id = ${envAppId},
            encrypted_app_secret = ${encSecret.ciphertext},
            app_secret_iv = ${encSecret.iv},
            app_secret_tag = ${encSecret.tag},
            encrypted_verify_token = ${encVerify ? encVerify.ciphertext : null},
            verify_token_iv = ${encVerify ? encVerify.iv : null},
            verify_token_tag = ${encVerify ? encVerify.tag : null},
            api_version = ${envApiVersion},
            webhook_url = COALESCE(webhook_url, ${envWebhookUrl}),
            is_active = true,
            last_verified_at = now(),
            updated_at = now()
          WHERE id = ${existing[0].id}
        `;
      } else {
        await sql`
          INSERT INTO meta_configurations (
            app_id, encrypted_app_secret, app_secret_iv, app_secret_tag,
            encrypted_verify_token, verify_token_iv, verify_token_tag,
            api_version, webhook_url, is_active, last_verified_at
          ) VALUES (
            ${envAppId}, ${encSecret.ciphertext}, ${encSecret.iv}, ${encSecret.tag},
            ${encVerify ? encVerify.ciphertext : null}, ${encVerify ? encVerify.iv : null}, ${encVerify ? encVerify.tag : null},
            ${envApiVersion}, ${envWebhookUrl}, true, now()
          )
        `;
      }

      return NextResponse.json({ status: 'ok', message: 'Environment variables synchronized into Meta configurations successfully.' });
    }

    // Default: Save Form Configuration
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

    let result: any;
    if (existing.length) {
      const id = existing[0].id;
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
      const { rows } = await sql`SELECT id,app_id,api_version,environment,updated_at,last_verified_at,is_active FROM meta_configurations WHERE id=${id} LIMIT 1`;
      result = rows[0];
    } else {
      const { rows } = await sql`
        INSERT INTO meta_configurations (app_id, encrypted_app_secret, app_secret_iv, app_secret_tag, embedded_signup_config_id, webhook_url, encrypted_verify_token, verify_token_iv, verify_token_tag, system_user_id, encrypted_system_user_token, system_user_token_iv, system_user_token_tag, api_version, environment)
        VALUES (${appId || null}, ${encryptedAppSecret}, ${appSecretIv}, ${appSecretTag}, ${embeddedSignupConfigId || null}, ${webhookUrl || null}, ${encryptedVerify}, ${verifyIv}, ${verifyTag}, ${systemUserId || null}, ${encSys}, ${sysIv}, ${sysTag}, ${apiVersion || 'v22.0'}, ${environment || 'production'})
        RETURNING id,app_id,api_version,environment,created_at,last_verified_at,is_active
      `;
      result = rows[0];
    }
    await logAdminAudit({ adminUserId: user!.userId, adminEmail: user!.email, action: AUDIT_ACTIONS.META_CONFIG_UPDATE, entityType: 'meta_configuration', entityId: result.id, newValues: { appId, apiVersion }, reason: body.reason }, request);
    return NextResponse.json({ status: 'ok', data: result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
