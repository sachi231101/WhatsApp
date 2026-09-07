import { pgTable, uuid, varchar, text, timestamp, integer, boolean, numeric, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { workspaces, users } from './tenants';

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
    providerSettingId: uuid('provider_setting_id').references(() => aiProviderSettings.id, { onDelete: 'restrict' }),
    name: varchar('name', { length: 100 }).notNull(),
    slug: varchar('slug', { length: 100 }).notNull(),
    avatarUrl: text('avatar_url'),
    roleDescription: text('role_description').notNull(),
    modelName: varchar('model_name', { length: 100 }).default('gemini-2.0-flash').notNull(),
    temperature: numeric('temperature', { precision: 3, scale: 2 }).default('0.20').notNull(),
    systemPrompt: text('system_prompt').notNull(),
    tone: varchar('tone', { length: 50 }).default('friendly').notNull(),
    autoTakeoverEnabled: boolean('auto_takeover_enabled').default(true).notNull(),
    humanHandoffThreshold: numeric('human_handoff_threshold', { precision: 3, scale: 2 }).default('0.70').notNull(),
    status: varchar('status', { length: 50 }).default('active').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('ai_agent_ws_slug_idx').on(table.workspaceId, table.slug),
    index('ai_agent_ws_idx').on(table.workspaceId),
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
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    embeddingModel: varchar('embedding_model', { length: 100 }).default('text-embedding-3-small').notNull(),
    embeddingDimension: integer('embedding_dimension').default(1536).notNull(),
    status: varchar('status', { length: 50 }).default('active').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('kb_ws_idx').on(table.workspaceId),
  ],
);

export const knowledgeSources = pgTable(
  'knowledge_sources',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    knowledgeBaseId: uuid('knowledge_base_id')
      .notNull()
      .references(() => knowledgeBases.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 50 }).notNull(), // file, website_crawl, text_snippet, notion, api
    uri: text('uri'),
    syncFrequency: varchar('sync_frequency', { length: 50 }).default('manual'),
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
    status: varchar('status', { length: 50 }).default('ready').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('kb_sources_ws_kb_idx').on(table.workspaceId, table.knowledgeBaseId),
  ],
);

export const documents = pgTable(
  'documents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    knowledgeSourceId: uuid('knowledge_source_id')
      .notNull()
      .references(() => knowledgeSources.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 255 }).notNull(),
    rawContent: text('raw_content').notNull(),
    contentHash: varchar('content_hash', { length: 64 }).notNull(),
    metaData: jsonb('meta_data').default({}).notNull(),
    totalTokens: integer('total_tokens').default(0).notNull(),
    status: varchar('status', { length: 50 }).default('processed').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('documents_source_idx').on(table.knowledgeSourceId),
    index('documents_ws_idx').on(table.workspaceId),
  ],
);

export const knowledgeChunks = pgTable(
  'knowledge_chunks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    documentId: uuid('document_id')
      .notNull()
      .references(() => documents.id, { onDelete: 'cascade' }),
    chunkIndex: integer('chunk_index').notNull(),
    content: text('content').notNull(),
    tokenCount: integer('token_count').notNull(),
    metaData: jsonb('meta_data').default({}).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('chunks_doc_idx').on(table.documentId),
    index('chunks_ws_idx').on(table.workspaceId),
  ],
);
