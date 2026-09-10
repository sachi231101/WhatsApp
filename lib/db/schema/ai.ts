import { pgTable, uuid, varchar, text, timestamp, integer, boolean, numeric, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { workspaces, users } from './tenants';
import { projects } from './projects';
import { conversations } from './messaging';

export const aiProviderSettings = pgTable(
  'ai_provider_settings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    provider: varchar('provider', { length: 50 }).notNull(), // google_gemini, anthropic, openai, groq
    encryptedApiKey: text('encrypted_api_key').notNull(),
    keyIv: varchar('key_iv', { length: 64 }).notNull(),
    keyTag: varchar('key_tag', { length: 64 }).notNull(),
    defaultModel: varchar('default_model', { length: 100 }).notNull(),
    isEnabled: boolean('is_enabled').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('ai_provider_ws_prov_idx').on(table.workspaceId, table.provider),
  ],
);

export const aiAgents = pgTable(
  'ai_agents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id')
      .references(() => projects.id, { onDelete: 'cascade' }),
    providerSettingId: uuid('provider_setting_id').references(() => aiProviderSettings.id, { onDelete: 'restrict' }),
    name: varchar('name', { length: 100 }).notNull(),
    slug: varchar('slug', { length: 100 }).notNull(),
    description: text('description'),
    avatarUrl: text('avatar_url'),
    roleDescription: text('role_description'),
    modelName: varchar('model_name', { length: 100 }).default('gpt-4o-mini').notNull(),
    temperature: numeric('temperature', { precision: 3, scale: 2 }).default('0.30').notNull(),
    systemPrompt: text('system_prompt'),
    tone: varchar('tone', { length: 50 }).default('Professional').notNull(),
    autoTakeoverEnabled: boolean('auto_takeover_enabled').default(true).notNull(),
    humanHandoffThreshold: numeric('human_handoff_threshold', { precision: 3, scale: 2 }).default('0.70').notNull(),
    status: varchar('status', { length: 50 }).default('DRAFT').notNull(), // DRAFT, ACTIVE, PAUSED, ARCHIVED
    handlingMode: varchar('handling_mode', { length: 50 }).default('AI_HANDLING').notNull(), // AI_HANDLING, HUMAN_HANDLING, HYBRID
    currentVersionId: uuid('current_version_id'),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('ai_agent_proj_slug_idx').on(table.projectId, table.slug),
    index('ai_agent_ws_idx').on(table.workspaceId),
    index('ai_agent_proj_idx').on(table.projectId),
    index('ai_agent_status_idx').on(table.status),
  ],
);

export const aiAgentVersions = pgTable(
  'ai_agent_versions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    agentId: uuid('agent_id')
      .notNull()
      .references(() => aiAgents.id, { onDelete: 'cascade' }),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    versionNumber: integer('version_number').notNull(),
    status: varchar('status', { length: 50 }).default('DRAFT').notNull(), // DRAFT, PUBLISHED, ARCHIVED
    role: text('role').notNull(),
    systemInstructions: text('system_instructions').notNull(),
    tone: varchar('tone', { length: 50 }).default('Professional').notNull(),
    language: varchar('language', { length: 50 }).default('English').notNull(),
    greetingMessage: text('greeting_message'),
    fallbackMessage: text('fallback_message'),
    responseBehavior: jsonb('response_behavior').default({}).notNull(),
    escalationEnabled: boolean('escalation_enabled').default(true).notNull(),
    escalationMessage: text('escalation_message'),
    escalationConditions: jsonb('escalation_conditions').default([]).notNull(),
    maxResponseLength: integer('max_response_length').default(300).notNull(),
    temperature: numeric('temperature', { precision: 3, scale: 2 }).default('0.30').notNull(),
    model: varchar('model', { length: 100 }).default('gpt-4o-mini').notNull(),
    provider: varchar('provider', { length: 50 }).default('openai').notNull(),
    configuration: jsonb('configuration').default({}).notNull(),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    publishedAt: timestamp('published_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('ai_agent_ver_num_idx').on(table.agentId, table.versionNumber),
    index('ai_agent_ver_agent_idx').on(table.agentId),
    index('ai_agent_ver_proj_idx').on(table.projectId),
  ],
);

export const aiAgentKnowledgeBases = pgTable(
  'ai_agent_knowledge_bases',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    agentId: uuid('agent_id')
      .notNull()
      .references(() => aiAgents.id, { onDelete: 'cascade' }),
    knowledgeBaseId: uuid('knowledge_base_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('ai_agent_kb_idx').on(table.agentId, table.knowledgeBaseId),
  ],
);

export const aiUsage = pgTable(
  'ai_usage',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    agentId: uuid('agent_id').references(() => aiAgents.id, { onDelete: 'set null' }),
    agentVersionId: uuid('agent_version_id').references(() => aiAgentVersions.id, { onDelete: 'set null' }),
    conversationId: uuid('conversation_id').references(() => conversations.id, { onDelete: 'set null' }),
    provider: varchar('provider', { length: 50 }).notNull(),
    model: varchar('model', { length: 100 }).notNull(),
    inputTokens: integer('input_tokens').default(0).notNull(),
    outputTokens: integer('output_tokens').default(0).notNull(),
    totalTokens: integer('total_tokens').default(0).notNull(),
    latencyMs: integer('latency_ms').default(0).notNull(),
    status: varchar('status', { length: 50 }).default('SUCCESS').notNull(), // SUCCESS, FAILED, ESCALATED
    errorCode: varchar('error_code', { length: 100 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('ai_usage_ws_created_idx').on(table.workspaceId, table.createdAt),
    index('ai_usage_proj_created_idx').on(table.projectId, table.createdAt),
    index('ai_usage_agent_created_idx').on(table.agentId, table.createdAt),
  ],
);

export const aiConfigurations = pgTable(
  'ai_configurations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    aiAgentId: uuid('ai_agent_id')
      .notNull()
      .references(() => aiAgents.id, { onDelete: 'cascade' }),
    officeHours: jsonb('office_hours').default({ enabled: false }).notNull(),
    outOfOfficeMessage: text('out_of_office_message'),
    fallbackUserId: uuid('fallback_user_id').references(() => users.id, { onDelete: 'set null' }),
    maxTurnsBeforeHandoff: integer('max_turns_before_handoff').default(10).notNull(),
    negativeSentimentEscalation: boolean('negative_sentiment_escalation').default(true).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('ai_config_agent_idx').on(table.aiAgentId),
    index('ai_config_ws_idx').on(table.workspaceId),
  ],
);

export const knowledgeBases = pgTable(
  'knowledge_bases',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id')
      .references(() => projects.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    embeddingModel: varchar('embedding_model', { length: 100 }).default('text-embedding-3-small').notNull(),
    embeddingDimension: integer('embedding_dimension').default(1536).notNull(),
    status: varchar('status', { length: 50 }).default('ACTIVE').notNull(), // ACTIVE, ARCHIVED
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
  },
  (table) => [
    index('kb_ws_idx').on(table.workspaceId),
    index('kb_proj_idx').on(table.projectId),
    index('kb_status_idx').on(table.status),
  ],
);

export const knowledgeSources = pgTable(
  'knowledge_sources',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id')
      .references(() => projects.id, { onDelete: 'cascade' }),
    knowledgeBaseId: uuid('knowledge_base_id')
      .notNull()
      .references(() => knowledgeBases.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 50 }).notNull(), // PDF, DOCX, TXT, CSV, URL, FAQ, TEXT
    name: varchar('name', { length: 255 }).notNull(),
    sourceUrl: text('source_url'),
    mimeType: varchar('mime_type', { length: 100 }),
    storageKey: text('storage_key'),
    checksum: varchar('checksum', { length: 64 }),
    status: varchar('status', { length: 50 }).default('PENDING').notNull(), // PENDING, PROCESSING, READY, FAILED, ARCHIVED
    errorMessage: text('error_message'),
    metadata: jsonb('metadata').default({}).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    processedAt: timestamp('processed_at', { withTimezone: true }),
  },
  (table) => [
    index('kb_sources_ws_kb_idx').on(table.workspaceId, table.knowledgeBaseId),
    index('kb_sources_proj_idx').on(table.projectId),
    index('kb_sources_status_idx').on(table.status),
  ],
);

export const knowledgeDocuments = pgTable(
  'knowledge_documents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id')
      .references(() => projects.id, { onDelete: 'cascade' }),
    knowledgeSourceId: uuid('knowledge_source_id')
      .notNull()
      .references(() => knowledgeSources.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 255 }).notNull(),
    content: text('content').notNull(),
    language: varchar('language', { length: 50 }).default('en'),
    characterCount: integer('character_count').default(0).notNull(),
    tokenCount: integer('token_count').default(0).notNull(),
    version: integer('version').default(1).notNull(),
    checksum: varchar('checksum', { length: 64 }),
    status: varchar('status', { length: 50 }).default('READY').notNull(), // READY, PENDING, FAILED
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('kb_docs_source_idx').on(table.knowledgeSourceId),
    index('kb_docs_ws_idx').on(table.workspaceId),
    index('kb_docs_proj_idx').on(table.projectId),
  ],
);

// Backward-compatible alias
export const documents = knowledgeDocuments;

export const knowledgeChunks = pgTable(
  'knowledge_chunks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id')
      .references(() => projects.id, { onDelete: 'cascade' }),
    knowledgeDocumentId: uuid('knowledge_document_id')
      .references(() => knowledgeDocuments.id, { onDelete: 'cascade' }),
    documentId: uuid('document_id'), // Backward-compatible legacy column
    chunkIndex: integer('chunk_index').notNull(),
    content: text('content').notNull(),
    tokenCount: integer('token_count').notNull(),
    metadata: jsonb('metadata').default({}).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('chunks_doc_idx').on(table.knowledgeDocumentId),
    index('chunks_ws_proj_idx').on(table.workspaceId, table.projectId),
  ],
);
