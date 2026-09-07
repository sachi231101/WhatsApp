import { sql } from '@/lib/db';
import { encrypt, decrypt } from '@/lib/crypto/encryption';

export interface ConnectWabaInput {
  workspaceId: string;
  wabaId: string;
  businessId?: string;
  name?: string;
  accessToken: string;
  phoneNumberId?: string;
  displayPhoneNumber?: string;
  isCallingEnabled?: boolean;
}

export interface WorkspacePhoneNumberRecord {
  id: string;
  phoneNumberId: string;
  displayPhoneNumber: string;
  verifiedName?: string | null;
  qualityRating: string;
  status: string;
  isCallingEnabled: boolean;
  createdAt: Date;
}

export interface WorkspaceWhatsAppAccountRecord {
  id: string;
  workspaceId: string;
  wabaId: string;
  businessId?: string | null;
  name: string;
  status: string;
  phoneNumbers: WorkspacePhoneNumberRecord[];
  createdAt: Date;
  updatedAt: Date;
}

export class WhatsAppConnectionService {
  /**
   * Connects a WhatsApp Business Account and optional phone number to a workspace,
   * encrypting the access token using AES-256-GCM.
   */
  async connectWaba(input: ConnectWabaInput): Promise<{ accountId: string; phoneId?: string }> {
    const encrypted = encrypt(input.accessToken);
    const accountName = input.name || `WABA ${input.wabaId}`;

    const { rows: accRows } = await sql`
      INSERT INTO whatsapp_accounts (
        workspace_id, waba_id, business_id, name,
        encrypted_access_token, token_iv, token_tag, status, updated_at
      )
      VALUES (
        ${input.workspaceId}, ${input.wabaId}, ${input.businessId || null}, ${accountName},
        ${encrypted.ciphertext}, ${encrypted.iv}, ${encrypted.tag}, 'connected', CURRENT_TIMESTAMP
      )
      ON CONFLICT (workspace_id, waba_id) DO UPDATE SET 
        business_id = COALESCE(EXCLUDED.business_id, whatsapp_accounts.business_id),
        name = COALESCE(EXCLUDED.name, whatsapp_accounts.name),
        encrypted_access_token = EXCLUDED.encrypted_access_token,
        token_iv = EXCLUDED.token_iv,
        token_tag = EXCLUDED.token_tag,
        status = 'connected',
        updated_at = CURRENT_TIMESTAMP
      RETURNING id
    `;

    const accountId = accRows[0]?.id;
    let phoneId: string | undefined;

    if (accountId && input.phoneNumberId) {
      const displayPhone = input.displayPhoneNumber || input.phoneNumberId;
      const callingEnabled = Boolean(input.isCallingEnabled);

      const { rows: phoneRows } = await sql`
        INSERT INTO whatsapp_phone_numbers (
          workspace_id, whatsapp_account_id, phone_number_id,
          display_phone_number, status, is_calling_enabled, updated_at
        )
        VALUES (
          ${input.workspaceId}, ${accountId}, ${input.phoneNumberId},
          ${displayPhone}, 'verified', ${callingEnabled}, CURRENT_TIMESTAMP
        )
        ON CONFLICT (phone_number_id) DO UPDATE SET
          workspace_id = EXCLUDED.workspace_id,
          whatsapp_account_id = EXCLUDED.whatsapp_account_id,
          display_phone_number = EXCLUDED.display_phone_number,
          status = 'verified',
          is_calling_enabled = EXCLUDED.is_calling_enabled,
          updated_at = CURRENT_TIMESTAMP
        RETURNING id
      `;
      phoneId = phoneRows[0]?.id;
    }

    return { accountId, phoneId };
  }

  /**
   * Retrieves all WhatsApp accounts and associated phone numbers for a workspace.
   * Cryptographic tokens are strictly omitted from the returned shape.
   */
  async getWorkspaceConnections(workspaceId: string): Promise<WorkspaceWhatsAppAccountRecord[]> {
    const { rows: accRows } = await sql`
      SELECT id, workspace_id, waba_id, business_id, name, status, created_at, updated_at
      FROM whatsapp_accounts
      WHERE workspace_id = ${workspaceId} AND status != 'deleted'
      ORDER BY created_at ASC
    `;

    if (accRows.length === 0) {
      return [];
    }

    const { rows: phoneRows } = await sql`
      SELECT id, whatsapp_account_id, phone_number_id, display_phone_number,
             verified_name, quality_rating, status, is_calling_enabled, created_at
      FROM whatsapp_phone_numbers
      WHERE workspace_id = ${workspaceId} AND status != 'deleted'
      ORDER BY created_at ASC
    `;

    return accRows.map((acc: any) => ({
      id: acc.id,
      workspaceId: acc.workspace_id,
      wabaId: acc.waba_id,
      businessId: acc.business_id,
      name: acc.name,
      status: acc.status,
      createdAt: acc.created_at,
      updatedAt: acc.updated_at,
      phoneNumbers: phoneRows
        .filter((p: any) => p.whatsapp_account_id === acc.id)
        .map((p: any) => ({
          id: p.id,
          phoneNumberId: p.phone_number_id,
          displayPhoneNumber: p.display_phone_number,
          verifiedName: p.verified_name,
          qualityRating: p.quality_rating || 'UNKNOWN',
          status: p.status,
          isCallingEnabled: Boolean(p.is_calling_enabled),
          createdAt: p.created_at,
        })),
    }));
  }

  /**
   * Decrypts and returns the Meta Graph API access token for an authorized workspace WABA.
   */
  async getDecryptedTokenForWaba(workspaceId: string, wabaId: string): Promise<string> {
    const { rows } = await sql`
      SELECT encrypted_access_token, token_iv, token_tag, status
      FROM whatsapp_accounts
      WHERE workspace_id = ${workspaceId} AND waba_id = ${wabaId}
      LIMIT 1
    `;

    if (rows.length === 0) {
      throw new Error(`No WhatsApp account found for WABA ${wabaId} in this workspace.`);
    }

    const acc = rows[0];
    if (acc.status === 'disconnected' || acc.status === 'deleted') {
      throw new Error(`WhatsApp account for WABA ${wabaId} is ${acc.status}.`);
    }

    if (!acc.encrypted_access_token || !acc.token_iv || !acc.token_tag) {
      throw new Error(`Corrupt token metadata for WABA ${wabaId}.`);
    }

    return decrypt({
      ciphertext: acc.encrypted_access_token,
      iv: acc.token_iv,
      tag: acc.token_tag,
    });
  }

  /**
   * Disconnects a WABA from the workspace.
   */
  async disconnectWaba(workspaceId: string, wabaId: string): Promise<boolean> {
    const { rowCount } = await sql`
      UPDATE whatsapp_accounts
      SET status = 'disconnected', updated_at = CURRENT_TIMESTAMP
      WHERE workspace_id = ${workspaceId} AND waba_id = ${wabaId}
    `;

    return (rowCount ?? 0) > 0;
  }
}

export const whatsappConnectionService = new WhatsAppConnectionService();
