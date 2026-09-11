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
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS auth0_user_id VARCHAR(255);`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_auth0_user_id ON users(auth0_user_id);`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_workspaces_slug ON workspaces(slug);`,
    `ALTER TABLE workspaces ALTER COLUMN tenant_id DROP NOT NULL;`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'client';`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS company_name VARCHAR(255);`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR(50);`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT FALSE;`,
    `ALTER TABLE users ALTER COLUMN auth0_sub DROP NOT NULL;`,
    `CREATE TABLE IF NOT EXISTS workspace_members (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role VARCHAR(50) NOT NULL DEFAULT 'VIEWER',
      status VARCHAR(50) NOT NULL DEFAULT 'active',
      invitation_status VARCHAR(50) NOT NULL DEFAULT 'active',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(workspace_id, user_id)
    );`,
    `ALTER TABLE workspace_members ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'active';`,
    `ALTER TABLE workspace_memberships ADD COLUMN IF NOT EXISTS invitation_status VARCHAR(50) NOT NULL DEFAULT 'active';`,
    `CREATE TABLE IF NOT EXISTS projects (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      slug VARCHAR(255),
      status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      archived_at TIMESTAMP WITH TIME ZONE
    );`,
    `ALTER TABLE projects ADD COLUMN IF NOT EXISTS slug VARCHAR(255);`,
    `ALTER TABLE projects ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;`,
    `CREATE INDEX IF NOT EXISTS idx_projects_ws ON projects(workspace_id);`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_ws_slug ON projects(workspace_id, slug);`,
    `CREATE INDEX IF NOT EXISTS idx_projects_ws_status ON projects(workspace_id, status);`,
    `CREATE TABLE IF NOT EXISTS whatsapp_connections (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      waba_id VARCHAR(100) NOT NULL,
      phone_number_id VARCHAR(100),
      display_phone_number VARCHAR(50),
      verified_name VARCHAR(255),
      business_name VARCHAR(255),
      status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
      encrypted_access_token TEXT NOT NULL,
      token_iv VARCHAR(64),
      token_tag VARCHAR(64),
      token_expires_at TIMESTAMP WITH TIME ZONE,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      last_verified_at TIMESTAMP WITH TIME ZONE,
      disconnected_at TIMESTAMP WITH TIME ZONE,
      UNIQUE(project_id)
    );`,
    `CREATE INDEX IF NOT EXISTS idx_whatsapp_conn_ws ON whatsapp_connections(workspace_id);`,
    `CREATE INDEX IF NOT EXISTS idx_whatsapp_conn_phone ON whatsapp_connections(phone_number_id);`,
    `CREATE INDEX IF NOT EXISTS idx_whatsapp_conn_waba ON whatsapp_connections(waba_id);`,
    `CREATE TABLE IF NOT EXISTS webhook_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
      project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
      provider VARCHAR(50) NOT NULL DEFAULT 'meta_whatsapp',
      event_type VARCHAR(100) DEFAULT 'messages',
      external_event_id VARCHAR(255),
      idempotency_hash VARCHAR(64) NOT NULL UNIQUE,
      meta_waba_id VARCHAR(100),
      field VARCHAR(50) DEFAULT 'messages',
      payload JSONB NOT NULL,
      signature_verified BOOLEAN NOT NULL DEFAULT FALSE,
      status VARCHAR(50) NOT NULL DEFAULT 'pending',
      processing_status VARCHAR(50) NOT NULL DEFAULT 'pending',
      attempts INT NOT NULL DEFAULT 0,
      retry_count INT NOT NULL DEFAULT 0,
      error TEXT,
      error_message TEXT,
      received_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      processed_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );`,
    `ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;`,
    `ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS provider VARCHAR(50) NOT NULL DEFAULT 'meta_whatsapp';`,
    `ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS event_type VARCHAR(100) DEFAULT 'messages';`,
    `ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS external_event_id VARCHAR(255);`,
    `ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS signature_verified BOOLEAN NOT NULL DEFAULT FALSE;`,
    `ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'pending';`,
    `ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS attempts INT NOT NULL DEFAULT 0;`,
    `ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS error TEXT;`,
    `CREATE INDEX IF NOT EXISTS idx_webhook_events_ext ON webhook_events(external_event_id);`,
    `CREATE INDEX IF NOT EXISTS idx_webhook_events_project ON webhook_events(project_id);`,

    // Step 5: Team Inbox & Conversation migrations
    `ALTER TABLE conversations ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;`,
    `ALTER TABLE conversations ADD COLUMN IF NOT EXISTS handling_mode VARCHAR(50) DEFAULT 'AI_HANDLING';`,
    `ALTER TABLE conversations ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'medium';`,
    `ALTER TABLE conversations ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE;`,
    `ALTER TABLE conversations ADD COLUMN IF NOT EXISTS escalation_reason TEXT;`,
    `ALTER TABLE conversations ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';`,
    `ALTER TABLE messages ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;`,
    `ALTER TABLE messages ADD COLUMN IF NOT EXISTS external_message_id VARCHAR(255);`,
    `ALTER TABLE messages ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(255);`,
    `ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to_message_id UUID;`,
    `ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_metadata JSONB DEFAULT '{}';`,
    `ALTER TABLE messages ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';`,
    `ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_internal BOOLEAN DEFAULT FALSE;`,
    `CREATE INDEX IF NOT EXISTS idx_conversations_proj_status ON conversations(project_id, status);`,
    `CREATE INDEX IF NOT EXISTS idx_conversations_proj_last_msg ON conversations(project_id, last_message_at DESC);`,
    `CREATE INDEX IF NOT EXISTS idx_conversations_proj_assigned ON conversations(project_id, assigned_user_id);`,
    `CREATE INDEX IF NOT EXISTS idx_messages_conv_created ON messages(conversation_id, created_at);`,
    `CREATE INDEX IF NOT EXISTS idx_messages_proj_created ON messages(project_id, created_at);`,
    `CREATE TABLE IF NOT EXISTS internal_notes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`,
    `CREATE INDEX IF NOT EXISTS idx_internal_notes_conv ON internal_notes(conversation_id, created_at);`,
    `CREATE INDEX IF NOT EXISTS idx_internal_notes_proj ON internal_notes(project_id);`,

    // Step 6: Contacts + Customer 360 migrations
    `ALTER TABLE contacts ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;`,
    `ALTER TABLE contacts ADD COLUMN IF NOT EXISTS display_name VARCHAR(255);`,
    `ALTER TABLE contacts ADD COLUMN IF NOT EXISTS company VARCHAR(255);`,
    `ALTER TABLE contacts ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ACTIVE';`,
    `ALTER TABLE contacts ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'MANUAL';`,
    `ALTER TABLE contacts ADD COLUMN IF NOT EXISTS email VARCHAR(255);`,
    `ALTER TABLE contacts ADD COLUMN IF NOT EXISTS lead_score INT DEFAULT 50;`,
    `ALTER TABLE contacts ADD COLUMN IF NOT EXISTS lifecycle_stage VARCHAR(50) DEFAULT 'lead';`,
    `ALTER TABLE contacts ALTER COLUMN wa_id DROP NOT NULL;`,
    `CREATE INDEX IF NOT EXISTS idx_contacts_proj ON contacts(project_id);`,
    `CREATE INDEX IF NOT EXISTS idx_contacts_ws_proj ON contacts(workspace_id, project_id);`,
    `CREATE INDEX IF NOT EXISTS idx_contacts_proj_last_activity ON contacts(project_id, last_activity_at DESC);`,
    `CREATE INDEX IF NOT EXISTS idx_contacts_proj_phone ON contacts(project_id, phone_number);`,
    `CREATE INDEX IF NOT EXISTS idx_contacts_proj_email ON contacts(project_id, email);`,
    `CREATE TABLE IF NOT EXISTS contact_phone_numbers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
      contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
      phone_number VARCHAR(50) NOT NULL,
      normalized_phone_number VARCHAR(50) NOT NULL,
      type VARCHAR(50) DEFAULT 'mobile' NOT NULL,
      is_primary BOOLEAN DEFAULT FALSE NOT NULL,
      verified BOOLEAN DEFAULT FALSE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`,
    `CREATE INDEX IF NOT EXISTS idx_contact_phones_contact ON contact_phone_numbers(contact_id);`,
    `CREATE INDEX IF NOT EXISTS idx_contact_phones_norm ON contact_phone_numbers(project_id, normalized_phone_number);`,
    `CREATE TABLE IF NOT EXISTS contact_emails (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
      contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
      email VARCHAR(255) NOT NULL,
      type VARCHAR(50) DEFAULT 'work' NOT NULL,
      is_primary BOOLEAN DEFAULT FALSE NOT NULL,
      verified BOOLEAN DEFAULT FALSE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`,
    `CREATE INDEX IF NOT EXISTS idx_contact_emails_contact ON contact_emails(contact_id);`,
    `CREATE INDEX IF NOT EXISTS idx_contact_emails_email ON contact_emails(project_id, email);`,
    `CREATE TABLE IF NOT EXISTS tags (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name VARCHAR(100) NOT NULL,
      color VARCHAR(50) DEFAULT '#1b59f8' NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
      UNIQUE(project_id, name)
    );`,
    `CREATE INDEX IF NOT EXISTS idx_tags_project ON tags(project_id);`,
    `CREATE TABLE IF NOT EXISTS contact_tags (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
      tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
      UNIQUE(contact_id, tag_id)
    );`,
    `CREATE INDEX IF NOT EXISTS idx_contact_tags_contact ON contact_tags(contact_id);`,
    `CREATE INDEX IF NOT EXISTS idx_contact_tags_tag ON contact_tags(tag_id);`,
    `CREATE INDEX IF NOT EXISTS idx_contact_tags_project ON contact_tags(project_id);`,
    `CREATE TABLE IF NOT EXISTS custom_field_definitions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name VARCHAR(100) NOT NULL,
      key VARCHAR(100) NOT NULL,
      type VARCHAR(50) NOT NULL,
      required BOOLEAN DEFAULT FALSE NOT NULL,
      options JSONB DEFAULT '[]' NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
      UNIQUE(project_id, key)
    );`,
    `CREATE INDEX IF NOT EXISTS idx_custom_fields_proj ON custom_field_definitions(project_id);`,
    `CREATE TABLE IF NOT EXISTS custom_field_values (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      definition_id UUID NOT NULL REFERENCES custom_field_definitions(id) ON DELETE CASCADE,
      contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
      value JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
      UNIQUE(definition_id, contact_id)
    );`,
    `CREATE INDEX IF NOT EXISTS idx_cf_values_contact ON custom_field_values(contact_id);`,
    `CREATE TABLE IF NOT EXISTS contact_notes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
      author_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`,
    `CREATE INDEX IF NOT EXISTS idx_contact_notes_contact ON contact_notes(contact_id, created_at DESC);`,
    `CREATE INDEX IF NOT EXISTS idx_contact_notes_proj ON contact_notes(project_id);`,
    `CREATE TABLE IF NOT EXISTS contact_activities (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
      type VARCHAR(50) NOT NULL,
      actor_id UUID,
      actor_name VARCHAR(255),
      description TEXT NOT NULL,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`,
    `CREATE INDEX IF NOT EXISTS idx_contact_act_contact ON contact_activities(contact_id, created_at DESC);`,
    `CREATE INDEX IF NOT EXISTS idx_contact_act_proj ON contact_activities(project_id);`,

    // Step 7: AI Agent Studio migrations
    `ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;`,
    `CREATE INDEX IF NOT EXISTS idx_audit_logs_proj ON audit_logs(project_id);`,
    `ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;`,
    `ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS description TEXT;`,
    `ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS handling_mode VARCHAR(50) DEFAULT 'AI_HANDLING';`,
    `ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS current_version_id UUID;`,
    `ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;`,
    `ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;`,
    `CREATE INDEX IF NOT EXISTS idx_ai_agents_proj ON ai_agents(project_id);`,
    `CREATE INDEX IF NOT EXISTS idx_ai_agents_ws ON ai_agents(workspace_id);`,
    `CREATE INDEX IF NOT EXISTS idx_ai_agents_status ON ai_agents(status);`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_agents_proj_slug ON ai_agents(project_id, slug);`,
    `CREATE TABLE IF NOT EXISTS ai_agent_versions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
      workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      version_number INT NOT NULL,
      status VARCHAR(50) DEFAULT 'DRAFT' NOT NULL,
      role TEXT NOT NULL,
      system_instructions TEXT NOT NULL,
      tone VARCHAR(50) DEFAULT 'Professional' NOT NULL,
      language VARCHAR(50) DEFAULT 'English' NOT NULL,
      greeting_message TEXT,
      fallback_message TEXT,
      response_behavior JSONB DEFAULT '{}' NOT NULL,
      escalation_enabled BOOLEAN DEFAULT TRUE NOT NULL,
      escalation_message TEXT,
      escalation_conditions JSONB DEFAULT '[]' NOT NULL,
      max_response_length INT DEFAULT 300 NOT NULL,
      temperature NUMERIC(3, 2) DEFAULT 0.30 NOT NULL,
      model VARCHAR(100) DEFAULT 'gpt-4o-mini' NOT NULL,
      provider VARCHAR(50) DEFAULT 'openai' NOT NULL,
      configuration JSONB DEFAULT '{}' NOT NULL,
      created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
      published_at TIMESTAMP WITH TIME ZONE,
      UNIQUE(agent_id, version_number)
    );`,
    `CREATE INDEX IF NOT EXISTS idx_ai_agent_ver_agent ON ai_agent_versions(agent_id);`,
    `CREATE INDEX IF NOT EXISTS idx_ai_agent_ver_proj ON ai_agent_versions(project_id);`,
    `CREATE INDEX IF NOT EXISTS idx_ai_agent_ver_agent_num ON ai_agent_versions(agent_id, version_number);`,
    `CREATE TABLE IF NOT EXISTS ai_agent_knowledge_bases (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
      knowledge_base_id UUID NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
      UNIQUE(agent_id, knowledge_base_id)
    );`,
    `CREATE TABLE IF NOT EXISTS ai_usage (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      agent_id UUID REFERENCES ai_agents(id) ON DELETE SET NULL,
      agent_version_id UUID REFERENCES ai_agent_versions(id) ON DELETE SET NULL,
      conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
      provider VARCHAR(50) NOT NULL,
      model VARCHAR(100) NOT NULL,
      input_tokens INT DEFAULT 0 NOT NULL,
      output_tokens INT DEFAULT 0 NOT NULL,
      total_tokens INT DEFAULT 0 NOT NULL,
      latency_ms INT DEFAULT 0 NOT NULL,
      status VARCHAR(50) DEFAULT 'SUCCESS' NOT NULL,
      error_code VARCHAR(100),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`,
    `CREATE INDEX IF NOT EXISTS idx_ai_usage_ws_created ON ai_usage(workspace_id, created_at DESC);`,
    `CREATE INDEX IF NOT EXISTS idx_ai_usage_proj_created ON ai_usage(project_id, created_at DESC);`,
    `CREATE INDEX IF NOT EXISTS idx_ai_usage_agent_created ON ai_usage(agent_id, created_at DESC);`,
    `ALTER TABLE ai_usage ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'INBOX';`,
    `ALTER TABLE ai_usage ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';`,

    // Step 8: Knowledge Base + pgvector RAG migrations
    `CREATE EXTENSION IF NOT EXISTS vector;`,
    `ALTER TABLE knowledge_bases ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;`,
    `ALTER TABLE knowledge_bases ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ACTIVE' NOT NULL;`,
    `ALTER TABLE knowledge_bases ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;`,
    `ALTER TABLE knowledge_bases ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;`,
    `CREATE INDEX IF NOT EXISTS idx_kb_proj ON knowledge_bases(project_id);`,
    `CREATE INDEX IF NOT EXISTS idx_kb_ws ON knowledge_bases(workspace_id);`,
    `CREATE INDEX IF NOT EXISTS idx_kb_status ON knowledge_bases(status);`,

    `ALTER TABLE knowledge_sources ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;`,
    `ALTER TABLE knowledge_sources ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'TEXT' NOT NULL;`,
    `ALTER TABLE knowledge_sources ADD COLUMN IF NOT EXISTS name VARCHAR(255);`,
    `ALTER TABLE knowledge_sources ADD COLUMN IF NOT EXISTS source_url TEXT;`,
    `ALTER TABLE knowledge_sources ADD COLUMN IF NOT EXISTS mime_type VARCHAR(100);`,
    `ALTER TABLE knowledge_sources ADD COLUMN IF NOT EXISTS storage_key TEXT;`,
    `ALTER TABLE knowledge_sources ADD COLUMN IF NOT EXISTS checksum VARCHAR(64);`,
    `ALTER TABLE knowledge_sources ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'PENDING' NOT NULL;`,
    `ALTER TABLE knowledge_sources ADD COLUMN IF NOT EXISTS error_message TEXT;`,
    `ALTER TABLE knowledge_sources ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}' NOT NULL;`,
    `ALTER TABLE knowledge_sources ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP WITH TIME ZONE;`,
    `CREATE INDEX IF NOT EXISTS idx_kb_sources_kb ON knowledge_sources(knowledge_base_id);`,
    `CREATE INDEX IF NOT EXISTS idx_kb_sources_proj ON knowledge_sources(project_id);`,
    `CREATE INDEX IF NOT EXISTS idx_kb_sources_status ON knowledge_sources(status);`,

    `CREATE TABLE IF NOT EXISTS knowledge_documents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      knowledge_source_id UUID NOT NULL REFERENCES knowledge_sources(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      language VARCHAR(50) DEFAULT 'en',
      character_count INT DEFAULT 0 NOT NULL,
      token_count INT DEFAULT 0 NOT NULL,
      version INT DEFAULT 1 NOT NULL,
      checksum VARCHAR(64),
      status VARCHAR(50) DEFAULT 'READY' NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`,
    `CREATE INDEX IF NOT EXISTS idx_kb_docs_source ON knowledge_documents(knowledge_source_id);`,
    `CREATE INDEX IF NOT EXISTS idx_kb_docs_ws ON knowledge_documents(workspace_id);`,
    `CREATE INDEX IF NOT EXISTS idx_kb_docs_proj ON knowledge_documents(project_id);`,

    `CREATE TABLE IF NOT EXISTS knowledge_chunks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      knowledge_document_id UUID NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
      chunk_index INT NOT NULL,
      content TEXT NOT NULL,
      token_count INT NOT NULL,
      embedding vector(1536),
      metadata JSONB DEFAULT '{}' NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`,
    `ALTER TABLE knowledge_chunks ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;`,
    `ALTER TABLE knowledge_chunks ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;`,
    `ALTER TABLE knowledge_chunks ADD COLUMN IF NOT EXISTS knowledge_document_id UUID REFERENCES knowledge_documents(id) ON DELETE CASCADE;`,
    `ALTER TABLE knowledge_chunks ADD COLUMN IF NOT EXISTS content TEXT;`,
    `ALTER TABLE knowledge_chunks ADD COLUMN IF NOT EXISTS embedding vector(1536);`,
    `ALTER TABLE knowledge_chunks ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';`,
    `CREATE INDEX IF NOT EXISTS idx_kb_chunks_doc ON knowledge_chunks(knowledge_document_id);`,
    `CREATE INDEX IF NOT EXISTS idx_kb_chunks_ws_proj ON knowledge_chunks(workspace_id, project_id);`,

    `CREATE INDEX IF NOT EXISTS idx_ai_agent_kb_agent ON ai_agent_knowledge_bases(agent_id);`,
    `CREATE INDEX IF NOT EXISTS idx_ai_agent_kb_kb ON ai_agent_knowledge_bases(knowledge_base_id);`,

    // Step 9: Automation Module Phase 1: Database + Domain Foundation
    `CREATE TABLE IF NOT EXISTS automations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      status VARCHAR(50) DEFAULT 'DRAFT' NOT NULL,
      current_version_id UUID,
      created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
      archived_at TIMESTAMP WITH TIME ZONE
    );`,
    `CREATE INDEX IF NOT EXISTS idx_automations_ws ON automations(workspace_id);`,
    `CREATE INDEX IF NOT EXISTS idx_automations_proj ON automations(project_id);`,
    `CREATE INDEX IF NOT EXISTS idx_automations_status ON automations(status);`,
    `CREATE INDEX IF NOT EXISTS idx_automations_ws_proj ON automations(workspace_id, project_id);`,

    `CREATE TABLE IF NOT EXISTS automation_versions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      automation_id UUID NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
      version_number INT NOT NULL,
      status VARCHAR(50) DEFAULT 'DRAFT' NOT NULL,
      created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
      published_at TIMESTAMP WITH TIME ZONE,
      UNIQUE(automation_id, version_number)
    );`,
    `CREATE INDEX IF NOT EXISTS idx_auto_versions_auto ON automation_versions(automation_id);`,
    `CREATE INDEX IF NOT EXISTS idx_auto_versions_status ON automation_versions(status);`,

    `DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_automations_curr_version'
      ) THEN
        ALTER TABLE automations
        ADD CONSTRAINT fk_automations_curr_version
        FOREIGN KEY (current_version_id) REFERENCES automation_versions(id) ON DELETE SET NULL;
      END IF;
    END $$;`,

    `CREATE TABLE IF NOT EXISTS automation_nodes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      automation_version_id UUID NOT NULL REFERENCES automation_versions(id) ON DELETE CASCADE,
      node_key VARCHAR(100) NOT NULL,
      type VARCHAR(100) NOT NULL,
      label VARCHAR(255) NOT NULL,
      position_x NUMERIC(10, 2) DEFAULT 0 NOT NULL,
      position_y NUMERIC(10, 2) DEFAULT 0 NOT NULL,
      configuration JSONB DEFAULT '{}' NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
      UNIQUE(automation_version_id, node_key)
    );`,
    `CREATE INDEX IF NOT EXISTS idx_auto_nodes_version ON automation_nodes(automation_version_id);`,

    `CREATE TABLE IF NOT EXISTS automation_edges (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      automation_version_id UUID NOT NULL REFERENCES automation_versions(id) ON DELETE CASCADE,
      source_node_id UUID NOT NULL REFERENCES automation_nodes(id) ON DELETE CASCADE,
      target_node_id UUID NOT NULL REFERENCES automation_nodes(id) ON DELETE CASCADE,
      source_handle VARCHAR(100),
      target_handle VARCHAR(100),
      condition_key VARCHAR(100),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`,
    `CREATE INDEX IF NOT EXISTS idx_auto_edges_version ON automation_edges(automation_version_id);`,
    `CREATE INDEX IF NOT EXISTS idx_auto_edges_source ON automation_edges(source_node_id);`,
    `CREATE INDEX IF NOT EXISTS idx_auto_edges_target ON automation_edges(target_node_id);`,

    `CREATE TABLE IF NOT EXISTS automation_executions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      automation_id UUID NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
      automation_version_id UUID NOT NULL REFERENCES automation_versions(id) ON DELETE CASCADE,
      trigger_type VARCHAR(100) NOT NULL,
      trigger_event_id VARCHAR(255),
      idempotency_key VARCHAR(255),
      conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
      contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
      status VARCHAR(50) DEFAULT 'QUEUED' NOT NULL,
      current_node_id UUID REFERENCES automation_nodes(id) ON DELETE SET NULL,
      started_at TIMESTAMP WITH TIME ZONE,
      completed_at TIMESTAMP WITH TIME ZONE,
      failed_at TIMESTAMP WITH TIME ZONE,
      error_code VARCHAR(100),
      error_message TEXT,
      metadata JSONB DEFAULT '{}' NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`,
    `CREATE INDEX IF NOT EXISTS idx_auto_exec_ws_created ON automation_executions(workspace_id, created_at DESC);`,
    `CREATE INDEX IF NOT EXISTS idx_auto_exec_proj_created ON automation_executions(project_id, created_at DESC);`,
    `CREATE INDEX IF NOT EXISTS idx_auto_exec_auto_created ON automation_executions(automation_id, created_at DESC);`,
    `CREATE INDEX IF NOT EXISTS idx_auto_exec_status ON automation_executions(status);`,
    `CREATE INDEX IF NOT EXISTS idx_auto_exec_trigger_event ON automation_executions(project_id, trigger_event_id);`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_auto_exec_idempotency ON automation_executions(workspace_id, project_id, idempotency_key) WHERE idempotency_key IS NOT NULL;`,

    `CREATE TABLE IF NOT EXISTS automation_execution_steps (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      execution_id UUID NOT NULL REFERENCES automation_executions(id) ON DELETE CASCADE,
      node_id UUID NOT NULL REFERENCES automation_nodes(id) ON DELETE CASCADE,
      status VARCHAR(50) DEFAULT 'PENDING' NOT NULL,
      input JSONB DEFAULT '{}' NOT NULL,
      output JSONB DEFAULT '{}' NOT NULL,
      error_code VARCHAR(100),
      error_message TEXT,
      started_at TIMESTAMP WITH TIME ZONE,
      completed_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`,
    `CREATE INDEX IF NOT EXISTS idx_auto_exec_steps_exec ON automation_execution_steps(execution_id);`,
    `CREATE INDEX IF NOT EXISTS idx_auto_exec_steps_node ON automation_execution_steps(node_id);`,

    // Phase 14: Action Engine - Tasks & Action Idempotency
    `CREATE TABLE IF NOT EXISTS tasks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
      conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      assignee_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      priority VARCHAR(20) DEFAULT 'medium' NOT NULL,
      status VARCHAR(20) DEFAULT 'open' NOT NULL,
      due_date TIMESTAMP WITH TIME ZONE,
      source VARCHAR(50) DEFAULT 'AUTOMATION' NOT NULL,
      idempotency_key VARCHAR(255),
      metadata JSONB DEFAULT '{}' NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`,
    `CREATE INDEX IF NOT EXISTS idx_tasks_proj_status ON tasks(project_id, status);`,
    `CREATE INDEX IF NOT EXISTS idx_tasks_proj_created ON tasks(project_id, created_at DESC);`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_tasks_idempotency ON tasks(project_id, idempotency_key) WHERE idempotency_key IS NOT NULL;`,

    `CREATE TABLE IF NOT EXISTS action_idempotency (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      execution_id UUID NOT NULL REFERENCES automation_executions(id) ON DELETE CASCADE,
      node_id UUID NOT NULL,
      idempotency_key VARCHAR(255) NOT NULL,
      action_type VARCHAR(100) NOT NULL,
      status VARCHAR(50) DEFAULT 'COMPLETED' NOT NULL,
      side_effect_id VARCHAR(255),
      output JSONB DEFAULT '{}' NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_action_idempotency_key ON action_idempotency(project_id, idempotency_key);`,
    `CREATE INDEX IF NOT EXISTS idx_action_idempotency_exec ON action_idempotency(execution_id);`,

    `ALTER TABLE internal_notes ALTER COLUMN user_id DROP NOT NULL;`,
    `ALTER TABLE internal_notes ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'USER';`,
    `ALTER TABLE internal_notes ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';`,

    // ── Super Admin: Plans, Subscriptions, Invoices, Payments, Audit, Meta Config, Health ──
    `CREATE TABLE IF NOT EXISTS plans (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(100) UNIQUE NOT NULL,
      description TEXT,
      price NUMERIC(10,2) NOT NULL DEFAULT 0,
      currency VARCHAR(10) NOT NULL DEFAULT 'USD',
      billing_cycle VARCHAR(50) NOT NULL DEFAULT 'monthly',
      tax_percent NUMERIC(5,2) DEFAULT 0,
      is_popular BOOLEAN DEFAULT FALSE NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'active',
      visibility VARCHAR(50) NOT NULL DEFAULT 'public',
      trial_days INT DEFAULT 0 NOT NULL,
      is_trial BOOLEAN DEFAULT FALSE NOT NULL,
      features JSONB DEFAULT '{}' NOT NULL,
      limits JSONB DEFAULT '{}' NOT NULL,
      metadata JSONB DEFAULT '{}' NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS plan_features (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
      feature_key VARCHAR(100) NOT NULL,
      feature_category VARCHAR(50) NOT NULL,
      display_name VARCHAR(255) NOT NULL,
      value_type VARCHAR(20) NOT NULL DEFAULT 'numeric',
      boolean_value BOOLEAN,
      numeric_value INT,
      is_unlimited BOOLEAN DEFAULT FALSE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
      UNIQUE(plan_id, feature_key)
    );`,
    `CREATE TABLE IF NOT EXISTS subscriptions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
      plan_id UUID REFERENCES plans(id) ON DELETE RESTRICT,
      status VARCHAR(50) NOT NULL DEFAULT 'trial',
      billing_cycle VARCHAR(50) NOT NULL DEFAULT 'monthly',
      current_period_start TIMESTAMP WITH TIME ZONE,
      current_period_end TIMESTAMP WITH TIME ZONE,
      trial_start TIMESTAMP WITH TIME ZONE,
      trial_end TIMESTAMP WITH TIME ZONE,
      cancelled_at TIMESTAMP WITH TIME ZONE,
      suspended_at TIMESTAMP WITH TIME ZONE,
      paused_at TIMESTAMP WITH TIME ZONE,
      override_limits JSONB DEFAULT '{}' NOT NULL,
      metadata JSONB DEFAULT '{}' NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`,
    `CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant ON subscriptions(tenant_id);`,
    `CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);`,
    `CREATE TABLE IF NOT EXISTS invoices (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
      subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
      invoice_number VARCHAR(100) UNIQUE NOT NULL,
      amount NUMERIC(10,2) NOT NULL,
      currency VARCHAR(10) NOT NULL DEFAULT 'USD',
      tax_amount NUMERIC(10,2) DEFAULT 0,
      total_amount NUMERIC(10,2) NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'pending',
      due_date TIMESTAMP WITH TIME ZONE,
      paid_at TIMESTAMP WITH TIME ZONE,
      metadata JSONB DEFAULT '{}' NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS payments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
      subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
      invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
      external_payment_id VARCHAR(255),
      gateway VARCHAR(50) NOT NULL DEFAULT 'razorpay',
      amount NUMERIC(10,2) NOT NULL,
      currency VARCHAR(10) NOT NULL DEFAULT 'USD',
      status VARCHAR(50) NOT NULL DEFAULT 'pending',
      gateway_response JSONB DEFAULT '{}' NOT NULL,
      refund_amount NUMERIC(10,2) DEFAULT 0,
      metadata JSONB DEFAULT '{}' NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS admin_audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      admin_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      admin_email VARCHAR(255),
      action VARCHAR(100) NOT NULL,
      entity_type VARCHAR(100) NOT NULL,
      entity_id VARCHAR(255),
      workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
      tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
      old_values JSONB,
      new_values JSONB,
      diff JSONB,
      reason TEXT,
      ip_address VARCHAR(45),
      user_agent TEXT,
      metadata JSONB DEFAULT '{}' NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`,
    `CREATE INDEX IF NOT EXISTS idx_admin_audit_action ON admin_audit_logs(action);`,
    `CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON admin_audit_logs(created_at DESC);`,
    `CREATE TABLE IF NOT EXISTS meta_configurations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      app_id VARCHAR(100),
      encrypted_app_secret TEXT,
      app_secret_iv VARCHAR(64),
      app_secret_tag VARCHAR(64),
      embedded_signup_config_id VARCHAR(100),
      webhook_url TEXT,
      webhook_verify_token VARCHAR(255),
      encrypted_verify_token TEXT,
      verify_token_iv VARCHAR(64),
      verify_token_tag VARCHAR(64),
      system_user_id VARCHAR(100),
      encrypted_system_user_token TEXT,
      system_user_token_iv VARCHAR(64),
      system_user_token_tag VARCHAR(64),
      api_version VARCHAR(20) DEFAULT 'v22.0',
      environment VARCHAR(20) DEFAULT 'production',
      is_active BOOLEAN DEFAULT TRUE NOT NULL,
      last_verified_at TIMESTAMP WITH TIME ZONE,
      metadata JSONB DEFAULT '{}' NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS system_health (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      subsystem VARCHAR(100) NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'healthy',
      latency_ms INT,
      error_message TEXT,
      metadata JSONB DEFAULT '{}' NOT NULL,
      checked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS support_tickets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
      workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      subject VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      category VARCHAR(100) DEFAULT 'general',
      priority VARCHAR(20) DEFAULT 'medium',
      status VARCHAR(50) NOT NULL DEFAULT 'new',
      assigned_admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
      metadata JSONB DEFAULT '{}' NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS tenant_usage_aggregates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      metric_type VARCHAR(100) NOT NULL,
      quantity INT NOT NULL DEFAULT 0,
      period_start TIMESTAMP WITH TIME ZONE NOT NULL,
      period_end TIMESTAMP WITH TIME ZONE NOT NULL,
      metadata JSONB DEFAULT '{}' NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`,
    // Seed default plans if missing
    `INSERT INTO plans (name, slug, description, price, currency, billing_cycle, is_popular, status, trial_days, features, limits)
     VALUES
       ('Starter', 'starter', 'Perfect for small teams getting started with WhatsApp', 29, 'USD', 'monthly', false, 'active', 14,
        '{"support":"email"}', '{"whatsapp_numbers":1,"messages":1000,"contacts":500,"ai_agents":1,"campaigns":5,"workflows":2,"team_members":3}'::jsonb),
       ('Pro', 'pro', 'For growing businesses that need more power', 79, 'USD', 'monthly', true, 'active', 14,
        '{"support":"priority"}', '{"whatsapp_numbers":3,"messages":10000,"contacts":5000,"ai_agents":5,"campaigns":50,"workflows":20,"team_members":15}'::jsonb),
       ('Enterprise', 'enterprise', 'Advanced features for large scale operations', 199, 'USD', 'monthly', false, 'active', 30,
        '{"support":"dedicated"}', '{"whatsapp_numbers":10,"messages":100000,"contacts":50000,"ai_agents":50,"campaigns":500,"workflows":200,"team_members":100}'::jsonb)
     ON CONFLICT (slug) DO NOTHING;`,
  ];
  for (const m of migrations) {
    try {
      await (sql as any).query(m);
    } catch {
      // Ignored if column or table already exists
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

function getTablesReadyFlag(): boolean {
  const g = globalThis as typeof globalThis & { __wazzappTablesReady?: boolean };
  return Boolean(tablesEnsured || g.__wazzappTablesReady);
}

function setTablesReadyFlag(): void {
  tablesEnsured = true;
  const g = globalThis as typeof globalThis & { __wazzappTablesReady?: boolean };
  g.__wazzappTablesReady = true;
}

/**
 * Skip the expensive multi-statement DDL when tables already exist.
 * Turbopack/HMR resets module locals; globalThis keeps the warm flag alive.
 */
export async function ensureCoreTablesCached(): Promise<'skipped' | 'ddl' | 'probe-ok'> {
  if (getTablesReadyFlag()) return 'skipped';

  const g = globalThis as typeof globalThis & {
    __wazzappTablesReady?: boolean;
    __wazzappTablesReadyPromise?: Promise<'skipped' | 'ddl' | 'probe-ok'>;
  };

  if (g.__wazzappTablesReadyPromise) {
    return g.__wazzappTablesReadyPromise;
  }

  g.__wazzappTablesReadyPromise = (async () => {
    try {
      await sql`SELECT 1 FROM workspaces LIMIT 1`;
      setTablesReadyFlag();
      return 'probe-ok' as const;
    } catch {
      // Tables missing or unreachable — run full DDL once
    }

    await ensureCoreTables();
    setTablesReadyFlag();
    return 'ddl' as const;
  })();

  try {
    return await g.__wazzappTablesReadyPromise;
  } finally {
    g.__wazzappTablesReadyPromise = undefined;
  }
}

/**
 * Resolves the authenticated user's workspace context.
 * In development or for new users, automatically seeds a default Tenant & Workspace.
 */
export async function resolveWorkspaceContext(
  userEmail: string,
  userName?: string,
  requestedWorkspaceId?: string,
): Promise<WorkspaceContext> {
  try {
    await ensureCoreTablesCached();
  } catch (err) {
    console.warn('ensureCoreTables notice (using existing or falling back):', err);
  }

  try {
    // 1. Find user (SELECT first — avoid write on every request)
    const { rows: existingUserRows } = await sql`
      SELECT id, email, name, is_super_admin, role
      FROM users
      WHERE LOWER(email) = ${userEmail.toLowerCase()}
      LIMIT 1
    `;

    let user = existingUserRows[0];
    if (!user) {
      const { rows: userRows } = await sql`
        INSERT INTO users (auth0_sub, email, name)
        VALUES (${'auth0|' + userEmail}, ${userEmail}, ${userName || userEmail.split('@')[0]})
        ON CONFLICT (email) DO UPDATE SET name = COALESCE(EXCLUDED.name, users.name)
        RETURNING id, email, name, is_super_admin, role
      `;
      user = userRows[0];
    }
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

    try {
      await sql`
        INSERT INTO projects (workspace_id, name, description, slug, status)
        VALUES (${workspace.id}, 'Default Project', 'Default initial project', 'default', 'ACTIVE')
      `;
    } catch {
      // Ignored if projects table doesn't exist yet
    }

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
    console.error('Failed to resolve workspace context dynamically:', error);
    // Never return fake DEV workspace IDs for real client sessions — they break FKs
    // (projects_workspace_id_fkey) and cause empty project lists / failed creates.
    if (process.env.BYPASS_AUTH === 'true' && process.env.NODE_ENV !== 'production') {
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
    throw error;
  }
}
