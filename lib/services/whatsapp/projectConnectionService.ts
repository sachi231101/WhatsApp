import { sql } from '@/lib/db';
import { encrypt, decrypt } from '@/lib/crypto/encryption';
import { metaGraphClient, MetaGraphApiException } from '@/lib/meta/graphClient';
import { getToken, subscribeWebhook } from '@/app/api/beUtils';
import { isMockMode } from '@/app/api/mockData';
import getPrivateConfig from '@/app/privateConfig';
import { isWhatsAppDevConfigAvailable } from '@/lib/whatsapp/devConfig';
import type { SessionInfo } from '@/app/types/api';

export type WhatsAppConnectionStatus =
  | 'PENDING'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'ERROR'
  | 'DISCONNECTED';

/** Safe, client-facing reason codes for connect / test flows */
export type ConnectionReasonCode =
  | 'CONNECTED'
  | 'DISCONNECTED'
  | 'INVALID_CREDENTIALS'
  | 'INVALID_PHONE_NUMBER'
  | 'UNAUTHORIZED'
  | 'META_API_ERROR'
  | 'CONFIGURATION_MISSING'
  | 'NETWORK_ERROR'
  | 'PHONE_IN_USE'
  | 'ERROR';

export interface SanitizedWhatsAppConnection {
  id: string;
  workspaceId: string;
  projectId: string;
  wabaId: string;
  phoneNumberId: string | null;
  displayPhoneNumber: string | null;
  verifiedName: string | null;
  businessName: string | null;
  status: WhatsAppConnectionStatus;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  lastVerifiedAt: string | null;
  disconnectedAt: string | null;
}

export interface ConnectionHealthResult {
  healthy: boolean;
  api: boolean;
  phone: boolean;
  webhook: boolean;
  token: boolean;
  status: WhatsAppConnectionStatus;
  reasonCode: ConnectionReasonCode;
  message?: string;
  checkedAt: string;
}

export interface ConnectProjectInput {
  projectId: string;
  workspaceId: string;
  code: string;
  appId: string;
  sessionInfo?: SessionInfo | null;
  directWabaId?: string;
  directPhoneId?: string;
  isCallingEnabled?: boolean;
}

export class DevWhatsAppConnectionError extends Error {
  public reasonCode: ConnectionReasonCode;
  public statusCode: number;

  constructor(reasonCode: ConnectionReasonCode, message: string, statusCode = 400) {
    super(message);
    this.name = 'DevWhatsAppConnectionError';
    this.reasonCode = reasonCode;
    this.statusCode = statusCode;
  }
}

function mapMetaExceptionToReason(err: MetaGraphApiException): ConnectionReasonCode {
  if (err.code === 190 || err.code === 102) return 'INVALID_CREDENTIALS';
  if (err.code === 10 || err.code === 200 || err.code === 100) {
    // 100 often = invalid object id (bad phone/waba)
    if (err.message?.toLowerCase().includes('phone') || err.message?.toLowerCase().includes('does not exist')) {
      return 'INVALID_PHONE_NUMBER';
    }
    if (err.code === 10 || err.code === 200) return 'UNAUTHORIZED';
  }
  return 'META_API_ERROR';
}

function reasonMessage(code: ConnectionReasonCode, fallback?: string): string {
  switch (code) {
    case 'CONNECTED':
      return 'WhatsApp connection is healthy.';
    case 'DISCONNECTED':
      return 'WhatsApp is not connected.';
    case 'INVALID_CREDENTIALS':
      return 'Invalid or expired access token.';
    case 'INVALID_PHONE_NUMBER':
      return 'Invalid WhatsApp phone number ID.';
    case 'UNAUTHORIZED':
      return 'Unauthorized to access this WhatsApp account.';
    case 'META_API_ERROR':
      return 'Meta API returned an error. Please try again.';
    case 'CONFIGURATION_MISSING':
      return 'Development WhatsApp configuration is missing on the server.';
    case 'NETWORK_ERROR':
      return 'Unable to reach Meta API. Check your network connection.';
    case 'PHONE_IN_USE':
      return 'This WhatsApp phone number is already connected to another workspace.';
    default:
      return fallback || 'Unable to connect to WhatsApp.';
  }
}

function rowToSanitized(r: Record<string, any>, statusFallback?: WhatsAppConnectionStatus): SanitizedWhatsAppConnection {
  return {
    id: r.id,
    workspaceId: r.workspace_id,
    projectId: r.project_id,
    wabaId: r.waba_id,
    phoneNumberId: r.phone_number_id || null,
    displayPhoneNumber: r.display_phone_number || null,
    verifiedName: r.verified_name || null,
    businessName: r.business_name || null,
    status: ((r.status || statusFallback || 'PENDING') as string).toUpperCase() as WhatsAppConnectionStatus,
    metadata: (r.metadata as Record<string, unknown>) || {},
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
    updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
    lastVerifiedAt: r.last_verified_at ? new Date(r.last_verified_at).toISOString() : null,
    disconnectedAt: r.disconnected_at ? new Date(r.disconnected_at).toISOString() : null,
  };
}

export class ProjectConnectionService {
  /**
   * Retrieves the current WhatsApp connection for a project.
   * Access tokens and cryptographic keys are strictly excluded.
   */
  async getProjectConnection(projectId: string): Promise<SanitizedWhatsAppConnection | null> {
    const { rows } = await sql`
      SELECT 
        id, workspace_id, project_id, waba_id, phone_number_id,
        display_phone_number, verified_name, business_name, status,
        metadata, created_at, updated_at, last_verified_at, disconnected_at
      FROM whatsapp_connections
      WHERE project_id = ${projectId}
      LIMIT 1
    `;

    if (rows.length === 0) {
      return null;
    }

    return rowToSanitized(rows[0]);
  }

  /**
   * True when server env has development WhatsApp credentials configured.
   * Never returns secret values.
   */
  isDevConfigAvailable(): boolean {
    return isWhatsAppDevConfigAvailable();
  }

  /**
   * Loads development credentials from server env (and optional admin meta_configurations token fallback).
   * NEVER return this object to the browser.
   */
  private async loadDevCredentials(): Promise<{
    accessToken: string;
    phoneNumberId: string;
    wabaId: string;
  }> {
    const cfg = await getPrivateConfig();
    let accessToken = cfg.whatsappAccessToken || '';
    const phoneNumberId = cfg.whatsappPhoneNumberId || '';
    const wabaId = cfg.whatsappBusinessAccountId || '';

    // Optional fallback: platform meta_configurations system user token
    if (
      (!accessToken || accessToken === 'your-whatsapp-cloud-api-access-token') &&
      phoneNumberId &&
      wabaId
    ) {
      try {
        const { rows } = await sql`
          SELECT encrypted_system_user_token, system_user_token_iv, system_user_token_tag
          FROM meta_configurations
          WHERE is_active = true AND encrypted_system_user_token IS NOT NULL
          ORDER BY updated_at DESC NULLS LAST
          LIMIT 1
        `;
        const row = rows[0];
        if (row?.encrypted_system_user_token && row.system_user_token_iv && row.system_user_token_tag) {
          accessToken = decrypt({
            ciphertext: row.encrypted_system_user_token,
            iv: row.system_user_token_iv,
            tag: row.system_user_token_tag,
          });
        }
      } catch {
        // ignore fallback failures; treat as configuration missing below
      }
    }

    const placeholder =
      !accessToken ||
      accessToken === 'your-whatsapp-cloud-api-access-token' ||
      !phoneNumberId ||
      phoneNumberId === 'your-whatsapp-phone-number-id' ||
      !wabaId ||
      wabaId === 'your-whatsapp-business-account-id';

    if (placeholder) {
      throw new DevWhatsAppConnectionError(
        'CONFIGURATION_MISSING',
        reasonMessage('CONFIGURATION_MISSING'),
        400,
      );
    }

    return { accessToken, phoneNumberId, wabaId };
  }

  /**
   * Internal method: Decrypts and returns the Meta Graph API access token.
   * NEVER expose this method's return value to API responses or browser.
   */
  async getDecryptedToken(projectId: string): Promise<string> {
    const { rows } = await sql`
      SELECT encrypted_access_token, token_iv, token_tag, status, waba_id
      FROM whatsapp_connections
      WHERE project_id = ${projectId}
      LIMIT 1
    `;

    if (rows.length === 0) {
      throw new Error(`No WhatsApp connection found for project ${projectId}`);
    }

    const r = rows[0];
    if (r.status === 'DISCONNECTED') {
      throw new Error(`WhatsApp connection for project ${projectId} is disconnected`);
    }

    if (!r.encrypted_access_token) {
      throw new Error(`Corrupted credentials for project ${projectId}`);
    }

    return decrypt({
      ciphertext: r.encrypted_access_token,
      iv: r.token_iv || '',
      tag: r.token_tag || '',
    });
  }

  /**
   * Syncs encrypted credentials into workspace-level whatsapp_accounts / phone_numbers.
   */
  private async syncWorkspaceAccounts(params: {
    workspaceId: string;
    wabaId: string;
    businessName: string;
    phoneNumberId: string;
    displayPhoneNumber: string;
    verifiedName: string | null;
    encrypted: { ciphertext: string; iv: string; tag: string };
    businessId?: string | null;
  }): Promise<void> {
    try {
      const { rows: accRows } = await sql`
        INSERT INTO whatsapp_accounts (
          workspace_id, waba_id, business_id, name,
          encrypted_access_token, token_iv, token_tag, status, updated_at
        )
        VALUES (
          ${params.workspaceId}, ${params.wabaId}, ${params.businessId || null}, ${params.businessName},
          ${params.encrypted.ciphertext}, ${params.encrypted.iv}, ${params.encrypted.tag}, 'connected', CURRENT_TIMESTAMP
        )
        ON CONFLICT (workspace_id, waba_id) DO UPDATE SET
          encrypted_access_token = EXCLUDED.encrypted_access_token,
          token_iv = EXCLUDED.token_iv,
          token_tag = EXCLUDED.token_tag,
          status = 'connected',
          updated_at = CURRENT_TIMESTAMP
        RETURNING id
      `;

      const accountId = accRows[0]?.id;
      if (accountId && params.phoneNumberId) {
        await sql`
          INSERT INTO whatsapp_phone_numbers (
            workspace_id, whatsapp_account_id, phone_number_id,
            display_phone_number, verified_name, status, updated_at
          )
          VALUES (
            ${params.workspaceId}, ${accountId}, ${params.phoneNumberId},
            ${params.displayPhoneNumber}, ${params.verifiedName}, 'verified', CURRENT_TIMESTAMP
          )
          ON CONFLICT (phone_number_id) DO UPDATE SET
            workspace_id = EXCLUDED.workspace_id,
            whatsapp_account_id = EXCLUDED.whatsapp_account_id,
            display_phone_number = EXCLUDED.display_phone_number,
            verified_name = EXCLUDED.verified_name,
            status = 'verified',
            updated_at = CURRENT_TIMESTAMP
        `;
      }
    } catch (syncErr) {
      console.warn('[ProjectConnectionService] Workspace backward compatibility sync warning:', syncErr);
    }
  }

  private async upsertConnection(params: {
    workspaceId: string;
    projectId: string;
    wabaId: string;
    phoneNumberId: string;
    displayPhoneNumber: string;
    verifiedName: string | null;
    businessName: string;
    status: WhatsAppConnectionStatus;
    encrypted: { ciphertext: string; iv: string; tag: string };
    metadata: Record<string, unknown>;
  }): Promise<SanitizedWhatsAppConnection> {
    const { rows: connRows } = await sql`
      INSERT INTO whatsapp_connections (
        workspace_id, project_id, waba_id, phone_number_id,
        display_phone_number, verified_name, business_name, status,
        encrypted_access_token, token_iv, token_tag, metadata,
        last_verified_at, disconnected_at, updated_at
      )
      VALUES (
        ${params.workspaceId}, ${params.projectId}, ${params.wabaId}, ${params.phoneNumberId},
        ${params.displayPhoneNumber}, ${params.verifiedName}, ${params.businessName}, ${params.status},
        ${params.encrypted.ciphertext}, ${params.encrypted.iv}, ${params.encrypted.tag}, ${JSON.stringify(params.metadata)},
        CURRENT_TIMESTAMP, NULL, CURRENT_TIMESTAMP
      )
      ON CONFLICT (project_id) DO UPDATE SET
        workspace_id = EXCLUDED.workspace_id,
        waba_id = EXCLUDED.waba_id,
        phone_number_id = EXCLUDED.phone_number_id,
        display_phone_number = EXCLUDED.display_phone_number,
        verified_name = EXCLUDED.verified_name,
        business_name = EXCLUDED.business_name,
        status = EXCLUDED.status,
        encrypted_access_token = EXCLUDED.encrypted_access_token,
        token_iv = EXCLUDED.token_iv,
        token_tag = EXCLUDED.token_tag,
        metadata = EXCLUDED.metadata,
        last_verified_at = CURRENT_TIMESTAMP,
        disconnected_at = NULL,
        updated_at = CURRENT_TIMESTAMP
      RETURNING 
        id, workspace_id, project_id, waba_id, phone_number_id,
        display_phone_number, verified_name, business_name, status,
        metadata, created_at, updated_at, last_verified_at, disconnected_at
    `;

    return rowToSanitized(connRows[0], params.status);
  }

  /**
   * Connects using server-side development WhatsApp Cloud API credentials.
   * Binds to the given project/workspace. Does not use Embedded Signup.
   */
  async connectFromDevelopmentConfig(input: {
    projectId: string;
    workspaceId: string;
  }): Promise<SanitizedWhatsAppConnection> {
    const { projectId, workspaceId } = input;
    const { accessToken, phoneNumberId, wabaId } = await this.loadDevCredentials();

    // Exclusive bind: another workspace already owns this phone
    const { rows: owners } = await sql`
      SELECT workspace_id, project_id
      FROM whatsapp_connections
      WHERE phone_number_id = ${phoneNumberId}
        AND status = 'CONNECTED'
        AND workspace_id != ${workspaceId}
      LIMIT 1
    `;
    if (owners.length > 0) {
      throw new DevWhatsAppConnectionError(
        'PHONE_IN_USE',
        reasonMessage('PHONE_IN_USE'),
        409,
      );
    }

    let businessName = 'WhatsApp Business';
    let verifiedName: string | null = null;
    let displayPhoneNumber: string | null = null;

    if (isMockMode()) {
      businessName = 'Development WhatsApp';
      verifiedName = 'Dev Support';
      displayPhoneNumber = '+1 (555) 000-0000';
    } else {
      try {
        const wabaData = await metaGraphClient.get<{
          id: string;
          name?: string;
        }>(`/${wabaId}?fields=id,name`, accessToken);
        if (wabaData?.name) businessName = wabaData.name;
      } catch (err: unknown) {
        if (err instanceof MetaGraphApiException) {
          const code = mapMetaExceptionToReason(err);
          throw new DevWhatsAppConnectionError(code, reasonMessage(code), 400);
        }
        throw new DevWhatsAppConnectionError(
          'NETWORK_ERROR',
          reasonMessage('NETWORK_ERROR'),
          503,
        );
      }

      try {
        const phoneData = await metaGraphClient.get<{
          id: string;
          display_phone_number?: string;
          verified_name?: string;
          status?: string;
        }>(
          `/${phoneNumberId}?fields=id,display_phone_number,verified_name,status`,
          accessToken,
        );
        displayPhoneNumber = phoneData.display_phone_number || null;
        verifiedName = phoneData.verified_name || null;
      } catch (err: unknown) {
        if (err instanceof MetaGraphApiException) {
          const code =
            err.code === 190 || err.code === 102
              ? 'INVALID_CREDENTIALS'
              : 'INVALID_PHONE_NUMBER';
          throw new DevWhatsAppConnectionError(code, reasonMessage(code), 400);
        }
        throw new DevWhatsAppConnectionError(
          'NETWORK_ERROR',
          reasonMessage('NETWORK_ERROR'),
          503,
        );
      }
    }

    displayPhoneNumber = displayPhoneNumber || phoneNumberId;

    let webhookSuccess = true;
    if (!isMockMode()) {
      try {
        await subscribeWebhook(accessToken, wabaId);
      } catch (webhookErr) {
        console.warn('[ProjectConnectionService] Dev webhook subscription warning:', webhookErr);
        webhookSuccess = false;
      }
    }

    const encrypted = encrypt(accessToken);
    const status: WhatsAppConnectionStatus = webhookSuccess ? 'CONNECTED' : 'ERROR';
    const metadata = {
      connectionSource: 'development' as const,
      webhookSubscribed: webhookSuccess,
      connectedAt: new Date().toISOString(),
    };

    const connection = await this.upsertConnection({
      workspaceId,
      projectId,
      wabaId,
      phoneNumberId,
      displayPhoneNumber,
      verifiedName,
      businessName,
      status,
      encrypted,
      metadata,
    });

    await this.syncWorkspaceAccounts({
      workspaceId,
      wabaId,
      businessName,
      phoneNumberId,
      displayPhoneNumber,
      verifiedName,
      encrypted,
    });

    return connection;
  }

  /**
   * Connects a WhatsApp Business account & phone number to a project (Embedded Signup).
   */
  async connectProject(input: ConnectProjectInput): Promise<SanitizedWhatsAppConnection> {
    const { projectId, workspaceId, code, appId, sessionInfo } = input;

    if (!code || typeof code !== 'string') {
      throw new Error("We couldn't authenticate with Meta. Please try again.");
    }

    let accessToken: string;
    try {
      if (isMockMode()) {
        accessToken = `mock_access_token_${Date.now()}`;
      } else {
        accessToken = await getToken(code, appId);
      }
    } catch (err) {
      console.error('[ProjectConnectionService] Token exchange failed:', err);
      throw new Error("We couldn't authenticate with Meta. Please try again.");
    }

    let wabaId = input.directWabaId || sessionInfo?.data?.waba_id;
    if (!wabaId && sessionInfo?.data?.page_ids?.[0]) {
      wabaId = sessionInfo.data.page_ids[0];
    }

    if (!wabaId && !isMockMode()) {
      try {
        const meData = await metaGraphClient.get<{ id: string; name?: string }>('/me', accessToken);
        wabaId = meData.id;
      } catch (err) {
        console.error('[ProjectConnectionService] Could not resolve WABA ID:', err);
      }
    }

    if (!wabaId) {
      if (isMockMode()) {
        wabaId = '109283746501928';
      } else {
        throw new Error('No WhatsApp Business Account was found.');
      }
    }

    let businessName = 'WhatsApp Business';
    let verifiedName: string | null = null;
    let displayPhoneNumber: string | null = null;
    let phoneNumberId = input.directPhoneId || sessionInfo?.data?.phone_number_id;

    if (isMockMode()) {
      businessName = 'Mock Business Global';
      verifiedName = 'Mock Business Support';
      displayPhoneNumber = '+1 (555) 019-2834';
      phoneNumberId = phoneNumberId || '209384756102938';
    } else {
      try {
        const wabaData = await metaGraphClient.get<{
          id: string;
          name?: string;
          phone_numbers?: { data: Array<{ id: string; display_phone_number: string; verified_name?: string }> };
        }>(`/${wabaId}?fields=id,name,phone_numbers`, accessToken);

        if (wabaData && wabaData.name) {
          businessName = wabaData.name;
        }

        const phones = wabaData?.phone_numbers?.data || [];
        if (!phoneNumberId && phones.length > 0) {
          phoneNumberId = phones[0].id;
          displayPhoneNumber = phones[0].display_phone_number;
          verifiedName = phones[0].verified_name || null;
        }
      } catch (err) {
        console.warn('[ProjectConnectionService] WABA discovery warning:', err);
      }

      if (phoneNumberId) {
        try {
          const phoneData = await metaGraphClient.get<{
            id: string;
            display_phone_number: string;
            verified_name?: string;
            status?: string;
          }>(`/${phoneNumberId}?fields=id,display_phone_number,verified_name,status`, accessToken);

          if (phoneData) {
            displayPhoneNumber = phoneData.display_phone_number || displayPhoneNumber;
            verifiedName = phoneData.verified_name || verifiedName;
          }
        } catch (err) {
          console.warn('[ProjectConnectionService] Phone discovery warning:', err);
        }
      }
    }

    if (!phoneNumberId) {
      throw new Error('No eligible WhatsApp Business phone number was found.');
    }

    displayPhoneNumber = displayPhoneNumber || phoneNumberId;

    let webhookSuccess = true;
    if (!isMockMode()) {
      try {
        await subscribeWebhook(accessToken, wabaId);
      } catch (webhookErr) {
        console.warn('[ProjectConnectionService] Webhook subscription warning:', webhookErr);
        webhookSuccess = false;
      }
    }

    const encrypted = encrypt(accessToken);
    const status: WhatsAppConnectionStatus = webhookSuccess ? 'CONNECTED' : 'ERROR';
    const metadata = {
      connectionSource: 'embedded_signup' as const,
      appId,
      webhookSubscribed: webhookSuccess,
      callingEnabled: Boolean(input.isCallingEnabled),
      connectedAt: new Date().toISOString(),
    };

    const connection = await this.upsertConnection({
      workspaceId,
      projectId,
      wabaId,
      phoneNumberId,
      displayPhoneNumber,
      verifiedName,
      businessName,
      status,
      encrypted,
      metadata,
    });

    await this.syncWorkspaceAccounts({
      workspaceId,
      wabaId,
      businessName,
      phoneNumberId,
      displayPhoneNumber,
      verifiedName,
      encrypted,
      businessId: sessionInfo?.data?.business_id || null,
    });

    return connection;
  }

  /**
   * Health check: probes WABA, phone, webhook subscription, and token validity.
   * Maps Meta API errors to safe reason codes without leaking tokens.
   */
  async checkConnectionHealth(projectId: string): Promise<ConnectionHealthResult> {
    const checkedAt = new Date().toISOString();

    const connection = await this.getProjectConnection(projectId);
    if (!connection) {
      return {
        healthy: false,
        api: false,
        phone: false,
        webhook: false,
        token: false,
        status: 'PENDING',
        reasonCode: 'DISCONNECTED',
        message: reasonMessage('DISCONNECTED'),
        checkedAt,
      };
    }

    if (connection.status === 'DISCONNECTED') {
      return {
        healthy: false,
        api: false,
        phone: false,
        webhook: false,
        token: false,
        status: 'DISCONNECTED',
        reasonCode: 'DISCONNECTED',
        message: reasonMessage('DISCONNECTED'),
        checkedAt,
      };
    }

    if (isMockMode()) {
      return {
        healthy: true,
        api: true,
        phone: true,
        webhook: true,
        token: true,
        status: 'CONNECTED',
        reasonCode: 'CONNECTED',
        message: reasonMessage('CONNECTED'),
        checkedAt,
      };
    }

    let token: string;
    try {
      token = await this.getDecryptedToken(projectId);
    } catch {
      return {
        healthy: false,
        api: false,
        phone: false,
        webhook: false,
        token: false,
        status: 'ERROR',
        reasonCode: 'INVALID_CREDENTIALS',
        message: reasonMessage('INVALID_CREDENTIALS'),
        checkedAt,
      };
    }

    let apiHealthy = false;
    let phoneHealthy = false;
    let webhookHealthy = false;
    let tokenHealthy = true;
    let reasonCode: ConnectionReasonCode = 'CONNECTED';

    try {
      await metaGraphClient.get(`/${connection.wabaId}?fields=id,name`, token);
      apiHealthy = true;
    } catch (err: unknown) {
      if (err instanceof MetaGraphApiException) {
        reasonCode = mapMetaExceptionToReason(err);
        if (reasonCode === 'INVALID_CREDENTIALS') tokenHealthy = false;
      } else {
        reasonCode = 'NETWORK_ERROR';
      }
    }

    if (connection.phoneNumberId && tokenHealthy && reasonCode !== 'NETWORK_ERROR') {
      try {
        await metaGraphClient.get(`/${connection.phoneNumberId}?fields=id,status`, token);
        phoneHealthy = true;
      } catch (err: unknown) {
        if (err instanceof MetaGraphApiException) {
          if (err.code === 190 || err.code === 102) {
            tokenHealthy = false;
            reasonCode = 'INVALID_CREDENTIALS';
          } else {
            reasonCode = 'INVALID_PHONE_NUMBER';
          }
        } else {
          reasonCode = 'NETWORK_ERROR';
        }
      }
    }

    if (tokenHealthy && reasonCode !== 'NETWORK_ERROR' && reasonCode !== 'INVALID_CREDENTIALS') {
      try {
        const subData = await metaGraphClient.get<{ data: Array<{ id: string }> }>(
          `/${connection.wabaId}/subscribed_apps`,
          token,
        );
        webhookHealthy = Boolean(subData?.data && subData.data.length > 0);
      } catch {
        webhookHealthy = false;
      }
    }

    const allHealthy = apiHealthy && phoneHealthy && webhookHealthy && tokenHealthy;
    if (allHealthy) {
      reasonCode = 'CONNECTED';
    } else if (reasonCode === 'CONNECTED') {
      reasonCode = 'META_API_ERROR';
    }

    const currentStatus: WhatsAppConnectionStatus = allHealthy ? 'CONNECTED' : 'ERROR';

    try {
      await sql`
        UPDATE whatsapp_connections
        SET 
          status = ${currentStatus},
          last_verified_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE project_id = ${projectId}
      `;
    } catch (dbErr) {
      console.warn('[ProjectConnectionService] Could not update health status in DB:', dbErr);
    }

    return {
      healthy: allHealthy,
      api: apiHealthy,
      phone: phoneHealthy,
      webhook: webhookHealthy,
      token: tokenHealthy,
      status: currentStatus,
      reasonCode,
      message: reasonMessage(reasonCode),
      checkedAt,
    };
  }

  /**
   * Disconnects a project's WhatsApp connection.
   * Preserves all conversations, messages, and contact data.
   */
  async disconnectProject(projectId: string, workspaceId: string): Promise<boolean> {
    const { rowCount } = await sql`
      UPDATE whatsapp_connections
      SET 
        status = 'DISCONNECTED',
        disconnected_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE project_id = ${projectId} AND workspace_id = ${workspaceId}
    `;

    return (rowCount ?? 0) > 0;
  }
}

export const projectConnectionService = new ProjectConnectionService();
