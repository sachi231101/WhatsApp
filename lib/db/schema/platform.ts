import { pgTable, uuid, varchar, text, timestamp, integer, boolean, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { workspaces, users, tenants } from './tenants';
import { contacts } from './messaging';
import { projects } from './projects';

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    action: varchar('action', { length: 100 }).notNull(), // waba:connected, token:rotated, agent:created
    entityType: varchar('entity_type', { length: 50 }).notNull(),
    entityId: varchar('entity_id', { length: 100 }).notNull(),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    diff: jsonb('diff'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('audit_logs_ws_created_idx').on(table.workspaceId, table.createdAt),
    index('audit_logs_action_idx').on(table.action),
  ],
);

export const webhookEvents = pgTable(
  'webhook_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'set null' }),
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
    provider: varchar('provider', { length: 50 }).default('meta_whatsapp').notNull(),
    eventType: varchar('event_type', { length: 100 }).default('messages'),
    externalEventId: varchar('external_event_id', { length: 255 }),
    idempotencyHash: varchar('idempotency_hash', { length: 64 }).notNull().unique(),
    metaWabaId: varchar('meta_waba_id', { length: 100 }),
    field: varchar('field', { length: 50 }).default('messages'),
    payload: jsonb('payload').notNull(),
    signatureVerified: boolean('signature_verified').default(false).notNull(),
    status: varchar('status', { length: 50 }).default('pending').notNull(),
    processingStatus: varchar('processing_status', { length: 50 }).default('pending').notNull(),
    attempts: integer('attempts').default(0).notNull(),
    retryCount: integer('retry_count').default(0).notNull(),
    error: text('error'),
    errorMessage: text('error_message'),
    receivedAt: timestamp('received_at', { withTimezone: true }).defaultNow().notNull(),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('webhook_events_hash_idx').on(table.idempotencyHash),
    index('webhook_events_ext_idx').on(table.externalEventId),
    index('webhook_events_queue_idx').on(table.processingStatus, table.receivedAt),
    index('webhook_events_status_idx').on(table.status, table.receivedAt),
    index('webhook_events_project_idx').on(table.projectId),
  ],
);

export const errorLogs = pgTable(
  'error_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }),
    subsystem: varchar('subsystem', { length: 50 }).notNull(), // meta_api, webrtc, ai_runner, database
    errorCode: varchar('error_code', { length: 100 }),
    errorMessage: text('error_message').notNull(),
    stackTrace: text('stack_trace'),
    contextPayload: jsonb('context_payload').default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('error_logs_ws_created_idx').on(table.workspaceId, table.createdAt),
  ],
);

export const usageEvents = pgTable(
  'usage_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    metricType: varchar('metric_type', { length: 50 }).notNull(), // meta_marketing_msg, meta_utility_msg, ai_prompt_tokens, webrtc_call_seconds
    quantity: integer('quantity').default(1).notNull(),
    metadata: jsonb('metadata').default({}),
    timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('usage_events_tenant_time_idx').on(table.tenantId, table.timestamp),
    index('usage_events_ws_metric_idx').on(table.workspaceId, table.metricType, table.timestamp),
  ],
);

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 255 }).notNull(),
    message: text('message').notNull(),
    category: varchar('category', { length: 50 }).notNull(), // urgent_handoff, campaign_complete, phone_warning
    linkUrl: text('link_url'),
    isRead: boolean('is_read').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('notifications_user_unread_idx').on(table.userId, table.isRead, table.createdAt),
  ],
);

export const demoBookings = pgTable(
  'demo_bookings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    contactId: uuid('contact_id').references(() => contacts.id, { onDelete: 'set null' }),
    contactName: varchar('contact_name', { length: 255 }).notNull(),
    contactEmail: varchar('contact_email', { length: 255 }),
    phoneNumber: varchar('phone_number', { length: 50 }).notNull(),
    title: varchar('title', { length: 255 }).default('Product Demo & Meeting').notNull(),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
    durationMinutes: integer('duration_minutes').default(30).notNull(),
    status: varchar('status', { length: 50 }).default('confirmed').notNull(), // confirmed, cancelled, completed, rescheduled
    bookedBy: varchar('booked_by', { length: 50 }).default('ai').notNull(), // ai, manual, customer
    meetLink: text('meet_link'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('demo_bookings_ws_scheduled_idx').on(table.workspaceId, table.scheduledAt),
    index('demo_bookings_status_idx').on(table.status),
  ],
);

