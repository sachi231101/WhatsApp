import { pgTable, uuid, varchar, text, timestamp, integer, boolean, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { workspaces, users } from './tenants';
import { whatsappPhoneNumbers } from './whatsapp';

export const contacts = pgTable(
  'contacts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    waId: varchar('wa_id', { length: 50 }).notNull(),
    phoneNumber: varchar('phone_number', { length: 50 }).notNull(),
    firstName: varchar('first_name', { length: 100 }),
    lastName: varchar('last_name', { length: 100 }),
    profileName: varchar('profile_name', { length: 255 }),
    avatarUrl: text('avatar_url'),
    email: varchar('email', { length: 255 }),
    leadScore: integer('lead_score').default(50).notNull(),
    lifecycleStage: varchar('lifecycle_stage', { length: 50 }).default('subscriber').notNull(),
    customAttributes: jsonb('custom_attributes').default({}),
    isBlocked: boolean('is_blocked').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('workspace_contact_wa_idx').on(table.workspaceId, table.waId),
    index('contact_workspace_idx').on(table.workspaceId),
    index('contact_phone_idx').on(table.workspaceId, table.phoneNumber),
  ],
);

export const contactPhoneNumbers = pgTable(
  'contact_phone_numbers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    contactId: uuid('contact_id')
      .notNull()
      .references(() => contacts.id, { onDelete: 'cascade' }),
    phoneNumber: varchar('phone_number', { length: 50 }).notNull(),
    label: varchar('label', { length: 50 }).default('mobile'),
    isPrimary: boolean('is_primary').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('contact_phone_unique_idx').on(table.workspaceId, table.phoneNumber),
    index('contact_phones_contact_idx').on(table.contactId),
  ],
);

export const conversations = pgTable(
  'conversations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    whatsappPhoneNumberId: uuid('whatsapp_phone_number_id')
      .notNull()
      .references(() => whatsappPhoneNumbers.id, { onDelete: 'cascade' }),
    contactId: uuid('contact_id')
      .notNull()
      .references(() => contacts.id, { onDelete: 'cascade' }),
    status: varchar('status', { length: 50 }).default('open').notNull(), // open, pending, resolved, snoozed
    channel: varchar('channel', { length: 50 }).default('whatsapp').notNull(),
    assignedUserId: uuid('assigned_user_id').references(() => users.id, { onDelete: 'set null' }),
    assignedAgentId: uuid('assigned_agent_id'),
    aiAutopilot: boolean('ai_autopilot').default(true).notNull(),
    lastMessageAt: timestamp('last_message_at', { withTimezone: true }).defaultNow().notNull(),
    lastMessagePreview: text('last_message_preview'),
    unreadCount: integer('unread_count').default(0).notNull(),
    windowExpiresAt: timestamp('window_expires_at', { withTimezone: true }), // 24hr customer service window
    firstResponseTimeSeconds: integer('first_response_time_seconds'),
    resolutionTimeSeconds: integer('resolution_time_seconds'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('workspace_phone_contact_conv_idx').on(table.workspaceId, table.whatsappPhoneNumberId, table.contactId),
    index('conversation_workspace_last_msg_idx').on(table.workspaceId, table.lastMessageAt),
    index('conversation_assigned_user_idx').on(table.workspaceId, table.assignedUserId),
  ],
);

export const conversationAssignments = pgTable(
  'conversation_assignments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    assigneeType: varchar('assignee_type', { length: 20 }).notNull(), // user, ai_agent, team
    assigneeId: uuid('assignee_id').notNull(),
    assignedByUserId: uuid('assigned_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    reason: varchar('reason', { length: 255 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('conv_assign_ws_conv_idx').on(table.workspaceId, table.conversationId),
  ],
);

export const messages = pgTable(
  'messages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    metaMessageId: varchar('meta_message_id', { length: 255 }).unique(),
    direction: varchar('direction', { length: 20 }).notNull(), // inbound, outbound
    senderType: varchar('sender_type', { length: 20 }).notNull(), // customer, user, ai_agent, system, automation
    senderId: uuid('sender_id'),
    type: varchar('type', { length: 50 }).default('text').notNull(), // text, image, document, audio, video, template, interactive, call_event
    body: text('body'),
    caption: text('caption'),
    mediaUrl: text('media_url'),
    mediaMimeType: varchar('media_mime_type', { length: 100 }),
    mediaSha256: varchar('media_sha256', { length: 100 }),
    interactivePayload: jsonb('interactive_payload'),
    templateName: varchar('template_name', { length: 100 }),
    templateParams: jsonb('template_params'),
    status: varchar('status', { length: 50 }).default('pending').notNull(), // pending, sent, delivered, read, failed
    errorCode: varchar('error_code', { length: 50 }),
    errorMessage: text('error_message'),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('msg_conversation_created_idx').on(table.conversationId, table.createdAt),
    index('msg_workspace_idx').on(table.workspaceId),
  ],
);

export const messageStatusEvents = pgTable(
  'message_status_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    messageId: uuid('message_id')
      .notNull()
      .references(() => messages.id, { onDelete: 'cascade' }),
    metaMessageId: varchar('meta_message_id', { length: 255 }).notNull(),
    status: varchar('status', { length: 50 }).notNull(), // sent, delivered, read, failed
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
    rawEvent: jsonb('raw_event').default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('msg_status_event_msg_idx').on(table.messageId),
    index('msg_status_event_meta_idx').on(table.metaMessageId),
  ],
);
