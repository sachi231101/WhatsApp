import { pgTable, uuid, varchar, text, timestamp, integer, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { workspaces, users } from './tenants';
import { whatsappAccounts, whatsappPhoneNumbers } from './whatsapp';
import { contacts } from './messaging';

export const whatsappTemplates = pgTable(
  'whatsapp_templates',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    whatsappAccountId: uuid('whatsapp_account_id')
      .notNull()
      .references(() => whatsappAccounts.id, { onDelete: 'cascade' }),
    metaTemplateId: varchar('meta_template_id', { length: 100 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    language: varchar('language', { length: 20 }).notNull(), // en_US, es, hi
    category: varchar('category', { length: 50 }).notNull(), // MARKETING, UTILITY, AUTHENTICATION
    status: varchar('status', { length: 50 }).notNull(), // APPROVED, PENDING, REJECTED, PAUSED
    headerType: varchar('header_type', { length: 50 }), // TEXT, IMAGE, VIDEO, DOCUMENT
    bodyText: text('body_text').notNull(),
    footerText: text('footer_text'),
    buttons: jsonb('buttons').default([]).notNull(),
    variableMappings: jsonb('variable_mappings').default([]).notNull(),
    qualityScore: varchar('quality_score', { length: 50 }).default('UNKNOWN'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('templates_ws_name_lang_idx').on(table.workspaceId, table.name, table.language),
    index('templates_status_idx').on(table.status),
  ],
);

export const campaignAudiences = pgTable(
  'campaign_audiences',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    type: varchar('type', { length: 50 }).default('dynamic').notNull(), // static_list, dynamic_filter
    filterCriteria: jsonb('filter_criteria').default({}).notNull(),
    estimatedReach: integer('estimated_reach').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('campaign_audiences_ws_idx').on(table.workspaceId),
  ],
);

export const campaigns = pgTable(
  'campaigns',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    whatsappPhoneNumberId: uuid('whatsapp_phone_number_id')
      .notNull()
      .references(() => whatsappPhoneNumbers.id, { onDelete: 'restrict' }),
    templateId: uuid('template_id')
      .notNull()
      .references(() => whatsappTemplates.id, { onDelete: 'restrict' }),
    createdByUserId: uuid('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    name: varchar('name', { length: 255 }).notNull(),
    status: varchar('status', { length: 50 }).default('draft').notNull(), // draft, scheduled, processing, completed, canceled, failed
    targetFilter: jsonb('target_filter').default({}).notNull(),
    totalRecipients: integer('total_recipients').default(0).notNull(),
    sentCount: integer('sent_count').default(0).notNull(),
    deliveredCount: integer('delivered_count').default(0).notNull(),
    readCount: integer('read_count').default(0).notNull(),
    repliedCount: integer('replied_count').default(0).notNull(),
    failedCount: integer('failed_count').default(0).notNull(),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    rateLimitPerSecond: integer('rate_limit_per_second').default(50).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('campaigns_ws_status_idx').on(table.workspaceId, table.status),
  ],
);

export const campaignRecipients = pgTable(
  'campaign_recipients',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    campaignId: uuid('campaign_id')
      .notNull()
      .references(() => campaigns.id, { onDelete: 'cascade' }),
    contactId: uuid('contact_id')
      .notNull()
      .references(() => contacts.id, { onDelete: 'cascade' }),
    phoneNumber: varchar('phone_number', { length: 50 }).notNull(),
    resolvedVariables: jsonb('resolved_variables').default({}).notNull(),
    status: varchar('status', { length: 50 }).default('pending').notNull(), // pending, dispatched, delivered, read, replied, failed
    metaMessageId: varchar('meta_message_id', { length: 255 }),
    errorCode: varchar('error_code', { length: 50 }),
    dispatchedAt: timestamp('dispatched_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('campaign_recipient_unique_idx').on(table.campaignId, table.contactId),
    index('campaign_recipients_status_idx').on(table.campaignId, table.status),
  ],
);

export const campaignEvents = pgTable(
  'campaign_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    campaignRecipientId: uuid('campaign_recipient_id')
      .notNull()
      .references(() => campaignRecipients.id, { onDelete: 'cascade' }),
    eventType: varchar('event_type', { length: 50 }).notNull(), // sent, delivered, read, clicked, replied, unsubscribed
    payload: jsonb('payload').default({}).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('campaign_events_recipient_idx').on(table.campaignRecipientId),
  ],
);
