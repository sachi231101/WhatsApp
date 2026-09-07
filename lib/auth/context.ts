import { sql } from '@vercel/postgres';
import { WORKSPACE_ROLES, type WorkspaceRole, normalizeWorkspaceRole } from './roles';
import { getPermissionsForRole } from './permissions';
import { hashPassword } from './password';

export interface WorkspaceContext {
  userId: string;
  userEmail: string;
  userName: string;
  tenantId: string;
  tenantName: string;
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
  userRole?: string; // 'admin' | 'client'
  permissions: string[];
  isSuperAdmin: boolean;
}

// Fixed deterministic UUIDs for development fallback
const DEV_TENANT_ID = '00000000-0000-0000-0000-000000000001';
const DEV_WORKSPACE_ID = '00000000-0000-0000-0000-000000000002';
const DEV_USER_ID = '00000000-0000-0000-0000-000000000003';

/**
 * Ensures the multi-tenant core tables exist in PostgreSQL.
 * Safe to run multiple times (uses CREATE TABLE IF NOT EXISTS).
 */
export async function ensureCoreTables(): Promise<void> {
  const ddl = `
    CREATE TABLE IF NOT EXISTS tenants (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(100) UNIQUE NOT NULL,
      plan VARCHAR(50) NOT NULL DEFAULT 'starter',
      status VARCHAR(50) NOT NULL DEFAULT 'active',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      auth0_sub VARCHAR(255) UNIQUE,
      email VARCHAR(255) UNIQUE NOT NULL,
      name VARCHAR(255),
      avatar_url TEXT,
      password_hash TEXT,
      role VARCHAR(50) DEFAULT 'client',
      company_name VARCHAR(255),
      phone_number VARCHAR(50),
      is_super_admin BOOLEAN DEFAULT FALSE,
      status VARCHAR(50) DEFAULT 'active',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS workspaces (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(100) NOT NULL,
      timezone VARCHAR(50) DEFAULT 'UTC',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS workspace_memberships (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role VARCHAR(50) NOT NULL DEFAULT 'member',
      invitation_status VARCHAR(50) NOT NULL DEFAULT 'active',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(workspace_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS whatsapp_accounts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      waba_id VARCHAR(100) NOT NULL,
      business_id VARCHAR(100),
      name VARCHAR(255),
      currency VARCHAR(10),
      timezone_id VARCHAR(50),
      encrypted_access_token TEXT NOT NULL,
      token_iv VARCHAR(64),
      token_tag VARCHAR(64),
      status VARCHAR(50) DEFAULT 'connected' NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(workspace_id, waba_id)
    );

    CREATE TABLE IF NOT EXISTS whatsapp_phone_numbers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      whatsapp_account_id UUID REFERENCES whatsapp_accounts(id) ON DELETE CASCADE,
      phone_number_id VARCHAR(100) NOT NULL UNIQUE,
      display_phone_number VARCHAR(50) NOT NULL,
      verified_name VARCHAR(255),
      quality_rating VARCHAR(50) DEFAULT 'UNKNOWN',
      code_verification_status VARCHAR(50) DEFAULT 'NOT_VERIFIED',
      account_mode VARCHAR(50) DEFAULT 'LIVE',
      status VARCHAR(50) DEFAULT 'PENDING' NOT NULL,
      is_default BOOLEAN DEFAULT FALSE NOT NULL,
      is_calling_enabled BOOLEAN DEFAULT FALSE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS contacts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      wa_id VARCHAR(50) NOT NULL,
      phone_number VARCHAR(50) NOT NULL,
      first_name VARCHAR(100),
      last_name VARCHAR(100),
      profile_name VARCHAR(255),
      avatar_url TEXT,
      custom_attributes JSONB DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(workspace_id, wa_id)
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      whatsapp_phone_number_id UUID REFERENCES whatsapp_phone_numbers(id) ON DELETE CASCADE,
      contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
      status VARCHAR(50) DEFAULT 'open' NOT NULL,
      channel VARCHAR(50) DEFAULT 'whatsapp' NOT NULL,
      assigned_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      last_message_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
      last_message_preview TEXT,
      unread_count INT DEFAULT 0 NOT NULL,
      window_expires_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
      UNIQUE(workspace_id, whatsapp_phone_number_id, contact_id)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      meta_message_id VARCHAR(255) UNIQUE,
      direction VARCHAR(20) NOT NULL,
      sender_type VARCHAR(20) NOT NULL,
      sender_id UUID,
      type VARCHAR(50) DEFAULT 'text' NOT NULL,
      body TEXT,
      caption TEXT,
      media_url TEXT,
      status VARCHAR(50) DEFAULT 'pending' NOT NULL,
      error_code VARCHAR(50),
      error_message TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
    );

    CREATE TABLE IF NOT EXISTS whatsapp_credentials (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      whatsapp_account_id UUID NOT NULL REFERENCES whatsapp_accounts(id) ON DELETE CASCADE UNIQUE,
      system_user_id VARCHAR(100),
      encrypted_access_token TEXT NOT NULL,
      token_iv VARCHAR(64) NOT NULL,
      token_tag VARCHAR(64) NOT NULL,
      token_type VARCHAR(50) DEFAULT 'SYSTEM_USER' NOT NULL,
      token_scope TEXT DEFAULT 'whatsapp_business_messaging,whatsapp_business_management',
      expires_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
    );

    CREATE TABLE IF NOT EXISTS phone_number_certificates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      whatsapp_phone_number_id UUID NOT NULL REFERENCES whatsapp_phone_numbers(id) ON DELETE CASCADE UNIQUE,
      encrypted_pin TEXT,
      pin_iv VARCHAR(64),
      pin_tag VARCHAR(64),
      cert_status VARCHAR(50) DEFAULT 'REGISTERED' NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ai_provider_settings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      provider VARCHAR(50) NOT NULL,
      encrypted_api_key TEXT NOT NULL,
      key_iv VARCHAR(64) NOT NULL,
      key_tag VARCHAR(64) NOT NULL,
      default_model VARCHAR(100) NOT NULL,
      is_enabled BOOLEAN DEFAULT TRUE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
      UNIQUE(workspace_id, provider)
    );

    CREATE TABLE IF NOT EXISTS ai_agents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      provider_setting_id UUID REFERENCES ai_provider_settings(id) ON DELETE RESTRICT,
      name VARCHAR(100) NOT NULL,
      slug VARCHAR(100) NOT NULL,
      avatar_url TEXT,
      role_description TEXT NOT NULL,
      model_name VARCHAR(100) DEFAULT 'gemini-2.0-flash' NOT NULL,
      temperature NUMERIC(3, 2) DEFAULT 0.20 NOT NULL,
      system_prompt TEXT NOT NULL,
      tone VARCHAR(50) DEFAULT 'friendly' NOT NULL,
      auto_takeover_enabled BOOLEAN DEFAULT TRUE NOT NULL,
      human_handoff_threshold NUMERIC(3, 2) DEFAULT 0.70 NOT NULL,
      status VARCHAR(50) DEFAULT 'active' NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
      UNIQUE(workspace_id, slug)
    );

    CREATE TABLE IF NOT EXISTS ai_configurations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE UNIQUE,
      active_agent_id UUID REFERENCES ai_agents(id) ON DELETE SET NULL,
      business_hours_only BOOLEAN DEFAULT FALSE NOT NULL,
      confidence_threshold NUMERIC(3, 2) DEFAULT 0.65 NOT NULL,
      enable_rag BOOLEAN DEFAULT TRUE NOT NULL,
      max_tokens_per_response INT DEFAULT 300 NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
    );

    CREATE TABLE IF NOT EXISTS knowledge_bases (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(100) NOT NULL,
      description TEXT,
      embedding_model VARCHAR(100) DEFAULT 'text-embedding-004' NOT NULL,
      is_default BOOLEAN DEFAULT FALSE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
      UNIQUE(workspace_id, slug)
    );

    CREATE TABLE IF NOT EXISTS knowledge_sources (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      knowledge_base_id UUID NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE,
      source_type VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      metadata JSONB DEFAULT '{}',
      sync_status VARCHAR(50) DEFAULT 'synced' NOT NULL,
      last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
    );

    CREATE TABLE IF NOT EXISTS knowledge_chunks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      knowledge_source_id UUID NOT NULL REFERENCES knowledge_sources(id) ON DELETE CASCADE,
      chunk_index INT NOT NULL,
      chunk_text TEXT NOT NULL,
      token_count INT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
    );

    CREATE TABLE IF NOT EXISTS workflows (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      trigger_type VARCHAR(50) NOT NULL,
      trigger_config JSONB DEFAULT '{}',
      is_active BOOLEAN DEFAULT FALSE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
    );

    CREATE TABLE IF NOT EXISTS workflow_versions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
      version_number INT NOT NULL,
      nodes JSONB NOT NULL DEFAULT '[]',
      edges JSONB NOT NULL DEFAULT '[]',
      is_published BOOLEAN DEFAULT FALSE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
      UNIQUE(workflow_id, version_number)
    );

    CREATE TABLE IF NOT EXISTS workflow_executions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
      workflow_version_id UUID NOT NULL REFERENCES workflow_versions(id) ON DELETE CASCADE,
      trigger_event_id VARCHAR(255),
      status VARCHAR(50) DEFAULT 'running' NOT NULL,
      current_step_id VARCHAR(100),
      context_data JSONB DEFAULT '{}',
      started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
      completed_at TIMESTAMP WITH TIME ZONE
    );

    CREATE TABLE IF NOT EXISTS workflow_execution_steps (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      execution_id UUID NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
      node_id VARCHAR(100) NOT NULL,
      node_type VARCHAR(50) NOT NULL,
      status VARCHAR(50) NOT NULL,
      input_data JSONB DEFAULT '{}',
      output_data JSONB DEFAULT '{}',
      error_message TEXT,
      executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
    );

    CREATE TABLE IF NOT EXISTS templates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      whatsapp_account_id UUID REFERENCES whatsapp_accounts(id) ON DELETE SET NULL,
      name VARCHAR(255) NOT NULL,
      language VARCHAR(10) NOT NULL,
      category VARCHAR(50) NOT NULL,
      header_type VARCHAR(20),
      header_content TEXT,
      body_text TEXT NOT NULL,
      footer_text TEXT,
      buttons JSONB DEFAULT '[]',
      meta_template_id VARCHAR(100),
      status VARCHAR(50) DEFAULT 'PENDING' NOT NULL,
      quality_score VARCHAR(20) DEFAULT 'UNKNOWN',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
      UNIQUE(workspace_id, name, language)
    );

    CREATE TABLE IF NOT EXISTS campaigns (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      template_id UUID NOT NULL REFERENCES templates(id) ON DELETE RESTRICT,
      whatsapp_phone_number_id UUID NOT NULL REFERENCES whatsapp_phone_numbers(id) ON DELETE RESTRICT,
      name VARCHAR(255) NOT NULL,
      status VARCHAR(50) DEFAULT 'draft' NOT NULL,
      scheduled_at TIMESTAMP WITH TIME ZONE,
      total_recipients INT DEFAULT 0 NOT NULL,
      sent_count INT DEFAULT 0 NOT NULL,
      delivered_count INT DEFAULT 0 NOT NULL,
      read_count INT DEFAULT 0 NOT NULL,
      failed_count INT DEFAULT 0 NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
    );

    CREATE TABLE IF NOT EXISTS campaign_recipients (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
      contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
      phone_number VARCHAR(50) NOT NULL,
      status VARCHAR(50) DEFAULT 'pending' NOT NULL,
      meta_message_id VARCHAR(255),
      error_message TEXT,
      sent_at TIMESTAMP WITH TIME ZONE,
      delivered_at TIMESTAMP WITH TIME ZONE,
      read_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
      UNIQUE(campaign_id, contact_id)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
      workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      action VARCHAR(100) NOT NULL,
      entity_type VARCHAR(50) NOT NULL,
      entity_id VARCHAR(100),
      old_values JSONB,
      new_values JSONB,
      ip_address VARCHAR(45),
      user_agent TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
    );

    CREATE TABLE IF NOT EXISTS webhook_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
      event_type VARCHAR(100) NOT NULL,
      meta_payload JSONB NOT NULL,
      processed_status VARCHAR(50) DEFAULT 'processed' NOT NULL,
      error_message TEXT,
      received_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
    );

    CREATE TABLE IF NOT EXISTS error_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
      subsystem VARCHAR(50) NOT NULL,
      error_code VARCHAR(100),
      error_message TEXT NOT NULL,
      stack_trace TEXT,
      context_payload JSONB DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
    );

    CREATE TABLE IF NOT EXISTS usage_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      metric_type VARCHAR(50) NOT NULL,
      quantity INT DEFAULT 1 NOT NULL,
      metadata JSONB DEFAULT '{}',
      timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      category VARCHAR(50) NOT NULL,
      link_url TEXT,
      is_read BOOLEAN DEFAULT FALSE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
    );

    CREATE TABLE IF NOT EXISTS demo_bookings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
      contact_name VARCHAR(255) NOT NULL,
      contact_email VARCHAR(255),
      phone_number VARCHAR(50) NOT NULL,
      title VARCHAR(255) DEFAULT 'Product Demo & Meeting' NOT NULL,
      scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
      duration_minutes INT DEFAULT 30 NOT NULL,
      status VARCHAR(50) DEFAULT 'confirmed' NOT NULL,
      booked_by VARCHAR(50) DEFAULT 'ai' NOT NULL,
      meet_link TEXT,
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_demo_bookings_ws_scheduled ON demo_bookings(workspace_id, scheduled_at);
  `;

  const statements = ddl.split(';').map((s) => s.trim()).filter(Boolean);
  for (const stmt of statements) {
    try {
      await (sql as any).query(stmt);
    } catch (err) {
      console.warn('ensureCoreTables statement notice:', err);
    }
  }

  const migrations = [
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'client';`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS company_name VARCHAR(255);`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR(50);`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT FALSE;`,
    `ALTER TABLE users ALTER COLUMN auth0_sub DROP NOT NULL;`,
    `ALTER TABLE workspace_memberships ADD COLUMN IF NOT EXISTS invitation_status VARCHAR(50) NOT NULL DEFAULT 'active';`,
  ];
  for (const m of migrations) {
    try {
      await (sql as any).query(m);
    } catch {
      // Ignored if column already exists
    }
  }

  // Seed default Demo Admin and Client accounts if not exists
  try {
    const adminPass = hashPassword('Admin@123456');
    const clientPass = hashPassword('Client@123456');

    await (sql as any).query(`
      INSERT INTO users (auth0_sub, email, name, role, is_super_admin, password_hash)
      VALUES ('local|admin', 'admin@wazzapp.com', 'System Admin', 'admin', TRUE, '${adminPass}')
      ON CONFLICT (email) DO UPDATE SET 
        role = 'admin',
        is_super_admin = TRUE,
        password_hash = COALESCE(users.password_hash, EXCLUDED.password_hash);
    `);

    await (sql as any).query(`
      INSERT INTO users (auth0_sub, email, name, role, is_super_admin, password_hash, company_name)
      VALUES ('local|client', 'client@company.com', 'Alex Morgan', 'client', FALSE, '${clientPass}', 'Acme Global Corp')
      ON CONFLICT (email) DO UPDATE SET 
        role = 'client',
        company_name = COALESCE(users.company_name, EXCLUDED.company_name),
        password_hash = COALESCE(users.password_hash, EXCLUDED.password_hash);
    `);
  } catch (seedErr) {
    console.warn('Seed notice:', seedErr);
  }
}

let tablesEnsured = false;

/**
 * Resolves the authenticated user's workspace context.
 * In development or for new users, automatically seeds a default Tenant & Workspace.
 */
export async function resolveWorkspaceContext(
  userEmail: string,
  userName?: string,
  requestedWorkspaceId?: string,
): Promise<WorkspaceContext> {
  if (!tablesEnsured) {
    try {
      await ensureCoreTables();
      tablesEnsured = true;
    } catch (err) {
      console.warn('ensureCoreTables notice (using existing or falling back):', err);
    }
  }

  try {
    // 1. Find or create user
    const { rows: userRows } = await sql`
      INSERT INTO users (auth0_sub, email, name)
      VALUES (${'auth0|' + userEmail}, ${userEmail}, ${userName || userEmail.split('@')[0]})
      ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
      RETURNING id, email, name, is_super_admin, role
    `;
    const user = userRows[0];
    const isSuperAdmin = Boolean(user.is_super_admin);

    // 2. Check for requested workspace or default membership
    let selectedWorkspace: any = null;

    if (requestedWorkspaceId) {
      // Look for explicit membership in requested workspace
      const { rows: reqRows } = await sql`
        SELECT 
          w.id as workspace_id, 
          w.name as workspace_name, 
          t.id as tenant_id, 
          t.name as tenant_name,
          wm.role
        FROM workspaces w
        JOIN tenants t ON w.tenant_id = t.id
        JOIN workspace_memberships wm ON w.id = wm.workspace_id
        WHERE wm.user_id = ${user.id} 
          AND w.id = ${requestedWorkspaceId}
          AND w.status = 'active'
          AND (wm.invitation_status IS NULL OR wm.invitation_status = 'active')
        LIMIT 1
      `;
      if (reqRows.length > 0) {
        selectedWorkspace = reqRows[0];
      } else if (isSuperAdmin) {
        // SuperAdmin can access any active workspace
        const { rows: adminWsRows } = await sql`
          SELECT 
            w.id as workspace_id, 
            w.name as workspace_name, 
            t.id as tenant_id, 
            t.name as tenant_name,
            ${WORKSPACE_ROLES.OWNER} as role
          FROM workspaces w
          JOIN tenants t ON w.tenant_id = t.id
          WHERE w.id = ${requestedWorkspaceId} AND w.status = 'active'
          LIMIT 1
        `;
        if (adminWsRows.length > 0) {
          selectedWorkspace = adminWsRows[0];
        }
      }
    }

    // If no requested workspace found, fetch the user's primary/default membership
    if (!selectedWorkspace) {
      const { rows: defaultRows } = await sql`
        SELECT 
          w.id as workspace_id, 
          w.name as workspace_name, 
          t.id as tenant_id, 
          t.name as tenant_name,
          wm.role
        FROM workspace_memberships wm
        JOIN workspaces w ON wm.workspace_id = w.id
        JOIN tenants t ON w.tenant_id = t.id
        WHERE wm.user_id = ${user.id} 
          AND w.status = 'active'
          AND (wm.invitation_status IS NULL OR wm.invitation_status = 'active')
        ORDER BY wm.created_at ASC
        LIMIT 1
      `;
      if (defaultRows.length > 0) {
        selectedWorkspace = defaultRows[0];
      }
    }

    if (selectedWorkspace) {
      const normalizedRole = normalizeWorkspaceRole(selectedWorkspace.role);
      return {
        userId: user.id,
        userEmail: user.email,
        userName: user.name,
        tenantId: selectedWorkspace.tenant_id,
        tenantName: selectedWorkspace.tenant_name,
        workspaceId: selectedWorkspace.workspace_id,
        workspaceName: selectedWorkspace.workspace_name,
        role: normalizedRole,
        userRole: user.role || (isSuperAdmin ? 'admin' : 'client'),
        permissions: getPermissionsForRole(normalizedRole),
        isSuperAdmin,
      };
    }

    // 3. If no membership at all, seed a default tenant & workspace for this user
    const tenantSlug = 'tenant-' + user.id.slice(0, 8);
    const { rows: tenantRows } = await sql`
      INSERT INTO tenants (name, slug)
      VALUES (${user.name + "'s Organization"}, ${tenantSlug})
      ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
      RETURNING id, name
    `;
    const tenant = tenantRows[0];

    const { rows: wsRows } = await sql`
      INSERT INTO workspaces (tenant_id, name, slug)
      VALUES (${tenant.id}, ${'Default Workspace'}, ${'default'})
      RETURNING id, name
    `;
    const workspace = wsRows[0];

    await sql`
      INSERT INTO workspace_memberships (workspace_id, user_id, role, invitation_status)
      VALUES (${workspace.id}, ${user.id}, ${WORKSPACE_ROLES.OWNER}, 'active')
      ON CONFLICT (workspace_id, user_id) DO NOTHING
    `;

    return {
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      tenantId: tenant.id,
      tenantName: tenant.name,
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      role: WORKSPACE_ROLES.OWNER,
      userRole: user.role || (isSuperAdmin ? 'admin' : 'client'),
      permissions: getPermissionsForRole(WORKSPACE_ROLES.OWNER),
      isSuperAdmin,
    };
  } catch (error) {
    console.error('Failed to resolve workspace context dynamically, using deterministic fallback:', error);
    return {
      userId: DEV_USER_ID,
      userEmail,
      userName: userName || 'Dev User',
      tenantId: DEV_TENANT_ID,
      tenantName: 'Acme Corp',
      workspaceId: DEV_WORKSPACE_ID,
      workspaceName: 'Default Workspace',
      role: WORKSPACE_ROLES.OWNER,
      userRole: 'admin',
      permissions: getPermissionsForRole(WORKSPACE_ROLES.OWNER),
      isSuperAdmin: true,
    };
  }
}
