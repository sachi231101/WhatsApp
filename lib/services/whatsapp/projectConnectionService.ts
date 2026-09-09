import { sql } from '@/lib/db';
import { encrypt, decrypt } from '@/lib/crypto/encryption';
import { metaGraphClient, MetaGraphApiException } from '@/lib/meta/graphClient';
import { getToken, subscribeWebhook } from '@/app/api/beUtils';
import { isMockMode } from '@/app/api/mockData';
import type { SessionInfo } from '@/app/types/api';

export type WhatsAppConnectionStatus =
  | 'PENDING'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'ERROR'
  | 'DISCONNECTED';

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

    const r = rows[0];
    return {
      id: r.id,
      workspaceId: r.workspace_id,
      projectId: r.project_id,
      wabaId: r.waba_id,
      phoneNumberId: r.phone_number_id || null,
      displayPhoneNumber: r.display_phone_number || null,
      verifiedName: r.verified_name || null,
      businessName: r.business_name || null,
      status: (r.status || 'PENDING').toUpperCase() as WhatsAppConnectionStatus,
      metadata: (r.metadata as Record<string, unknown>) || {},
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
      updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
      lastVerifiedAt: r.last_verified_at ? new Date(r.last_verified_at).toISOString() : null,
      disconnectedAt: r.disconnected_at ? new Date(r.disconnected_at).toISOString() : null,
    };
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

    // Decrypt using AES-256-GCM
    return decrypt({
      ciphertext: r.encrypted_access_token,
      iv: r.token_iv || '',
      tag: r.token_tag || '',
    });
  }

  /**
   * Connects a WhatsApp Business account & phone number to a project.
   */
  async connectProject(input: ConnectProjectInput): Promise<SanitizedWhatsAppConnection> {
    const { projectId, workspaceId, code, appId, sessionInfo } = input;

    if (!code || typeof code !== 'string') {
      throw new Error("We couldn't authenticate with Meta. Please try again.");
    }

    // 1. Exchange OAuth code for Meta Access Token
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

    // 2. Discover WABA ID
    let wabaId = input.directWabaId || sessionInfo?.data?.waba_id;
    if (!wabaId && sessionInfo?.data?.page_ids?.[0]) {
      wabaId = sessionInfo.data.page_ids[0];
    }

    // If no WABA ID found in sessionInfo, query Meta Graph API debug or /me/businesses
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

    // 3. Discover WABA & Business metadata
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

        // If phone_number_id is missing, pick from waba phone_numbers
        const phones = wabaData?.phone_numbers?.data || [];
        if (!phoneNumberId && phones.length > 0) {
          phoneNumberId = phones[0].id;
          displayPhoneNumber = phones[0].display_phone_number;
          verifiedName = phones[0].verified_name || null;
        }
      } catch (err) {
        console.warn('[ProjectConnectionService] WABA discovery warning:', err);
      }

      // If we have a phoneNumberId, fetch phone details
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

    // 4. Webhook Subscription
    let webhookSuccess = true;
    if (!isMockMode()) {
      try {
        await subscribeWebhook(accessToken, wabaId);
      } catch (webhookErr) {
        console.warn('[ProjectConnectionService] Webhook subscription warning:', webhookErr);
        webhookSuccess = false;
      }
    }

    // 5. Encrypt access token using AES-256-GCM
    const encrypted = encrypt(accessToken);

    // 6. Persist connection in whatsapp_connections table
    const status: WhatsAppConnectionStatus = webhookSuccess ? 'CONNECTED' : 'ERROR';
    const metadata = {
      appId,
      webhookSubscribed: webhookSuccess,
      callingEnabled: Boolean(input.isCallingEnabled),
      connectedAt: new Date().toISOString(),
    };

    const { rows: connRows } = await sql`
      INSERT INTO whatsapp_connections (
        workspace_id, project_id, waba_id, phone_number_id,
        display_phone_number, verified_name, business_name, status,
        encrypted_access_token, token_iv, token_tag, metadata,
        last_verified_at, disconnected_at, updated_at
      )
      VALUES (
        ${workspaceId}, ${projectId}, ${wabaId}, ${phoneNumberId},
        ${displayPhoneNumber}, ${verifiedName}, ${businessName}, ${status},
        ${encrypted.ciphertext}, ${encrypted.iv}, ${encrypted.tag}, ${JSON.stringify(metadata)},
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

    // 7. Backward compatibility synchronization to whatsapp_accounts and whatsapp_phone_numbers
    try {
      const { rows: accRows } = await sql`
        INSERT INTO whatsapp_accounts (
          workspace_id, waba_id, business_id, name,
          encrypted_access_token, token_iv, token_tag, status, updated_at
        )
        VALUES (
          ${workspaceId}, ${wabaId}, ${sessionInfo?.data?.business_id || null}, ${businessName},
          ${encrypted.ciphertext}, ${encrypted.iv}, ${encrypted.tag}, 'connected', CURRENT_TIMESTAMP
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
      if (accountId && phoneNumberId) {
        await sql`
          INSERT INTO whatsapp_phone_numbers (
            workspace_id, whatsapp_account_id, phone_number_id,
            display_phone_number, verified_name, status, updated_at
          )
          VALUES (
            ${workspaceId}, ${accountId}, ${phoneNumberId},
            ${displayPhoneNumber}, ${verifiedName}, 'verified', CURRENT_TIMESTAMP
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

    const r = connRows[0];
    return {
      id: r.id,
      workspaceId: r.workspace_id,
      projectId: r.project_id,
      wabaId: r.waba_id,
      phoneNumberId: r.phone_number_id,
      displayPhoneNumber: r.display_phone_number,
      verifiedName: r.verified_name,
      businessName: r.business_name,
      status: (r.status as WhatsAppConnectionStatus) || status,
      metadata: (r.metadata as Record<string, unknown>) || {},
      createdAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString(),
      lastVerifiedAt: r.last_verified_at ? new Date(r.last_verified_at).toISOString() : null,
      disconnectedAt: null,
    };
  }

  /**
   * Health check abstraction: tests WABA access, phone status, webhook subscription, and token validity.
   * Maps Meta API errors to safe application messages without leaking tokens.
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
        message: 'No WhatsApp connection found for this project.',
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
        message: 'WhatsApp connection is currently disconnected.',
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
        message: 'Access token could not be decrypted. Reconnection required.',
        checkedAt,
      };
    }

    let apiHealthy = false;
    let phoneHealthy = false;
    let webhookHealthy = false;
    let tokenHealthy = true;

    // 1. WhatsApp API / WABA check
    try {
      await metaGraphClient.get(`/${connection.wabaId}?fields=id,name`, token);
      apiHealthy = true;
    } catch (err: any) {
      if (err instanceof MetaGraphApiException && (err.code === 190 || err.code === 102)) {
        tokenHealthy = false;
      }
    }

    // 2. Phone number check
    if (connection.phoneNumberId && tokenHealthy) {
      try {
        await metaGraphClient.get(`/${connection.phoneNumberId}?fields=id,status`, token);
        phoneHealthy = true;
      } catch (err: any) {
        if (err instanceof MetaGraphApiException && (err.code === 190 || err.code === 102)) {
          tokenHealthy = false;
        }
      }
    }

    // 3. Webhook subscription check
    if (tokenHealthy) {
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
    const currentStatus: WhatsAppConnectionStatus = allHealthy ? 'CONNECTED' : 'ERROR';

    // Update last_verified_at in DB
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
      message: allHealthy ? undefined : 'Connection requires attention. Your WhatsApp connection needs to be reconnected.',
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
