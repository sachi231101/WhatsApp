import { pgTable, uuid, varchar, text, timestamp, integer, boolean, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { workspaces, users } from './tenants';
import { whatsappPhoneNumbers } from './whatsapp';
import { projects } from './projects';

export const contacts = pgTable(
  'contacts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id')
      .references(() => projects.id, { onDelete: 'cascade' }),
    waId: varchar('wa_id', { length: 50 }),
    phoneNumber: varchar('phone_number', { length: 50 }).notNull(),
    firstName: varchar('first_name', { length: 100 }),
    lastName: varchar('last_name', { length: 100 }),
    displayName: varchar('display_name', { length: 255 }),
    profileName: varchar('profile_name', { length: 255 }),
    avatarUrl: text('avatar_url'),
    email: varchar('email', { length: 255 }),
    company: varchar('company', { length: 255 }),
    status: varchar('status', { length: 50 }).default('ACTIVE').notNull(), // ACTIVE, INACTIVE, BLOCKED, ARCHIVED
    leadScore: integer('lead_score').default(50).notNull(), // 0-100
    source: varchar('source', { length: 50 }).default('MANUAL').notNull(), // WHATSAPP, IMPORT, MANUAL, CAMPAIGN, WEBSITE, API, AUTOMATION
    lifecycleStage: varchar('lifecycle_stage', { length: 50 }).default('subscriber').notNull(),
    customAttributes: jsonb('custom_attributes').default({}),
    isBlocked: boolean('is_blocked').default(false).notNull(),
    lastActivityAt: timestamp('last_activity_at', { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('contact_workspace_idx').on(table.workspaceId),
    index('contact_project_idx').on(table.projectId),
    index('contact_project_phone_idx').on(table.projectId, table.phoneNumber),
    index('contact_project_last_activity_idx').on(table.projectId, table.lastActivityAt),
    index('contact_workspace_wa_idx').on(table.workspaceId, table.waId),
  ],
);

export const contactPhoneNumbers = pgTable(
  'contact_phone_numbers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id')
      .references(() => projects.id, { onDelete: 'cascade' }),
    contactId: uuid('contact_id')
      .notNull()
      .references(() => contacts.id, { onDelete: 'cascade' }),
    phoneNumber: varchar('phone_number', { length: 50 }).notNull(),
    normalizedPhoneNumber: varchar('normalized_phone_number', { length: 50 }).notNull(),
    type: varchar('type', { length: 50 }).default('mobile').notNull(), // mobile, work, home, whatsapp, other
    isPrimary: boolean('is_primary').default(false).notNull(),
    verified: boolean('verified').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('contact_phones_contact_idx').on(table.contactId),
    index('contact_phones_norm_idx').on(table.projectId, table.normalizedPhoneNumber),
  ],
);

export const contactEmails = pgTable(
  'contact_emails',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id')
      .references(() => projects.id, { onDelete: 'cascade' }),
    contactId: uuid('contact_id')
      .notNull()
      .references(() => contacts.id, { onDelete: 'cascade' }),
    email: varchar('email', { length: 255 }).notNull(),
    type: varchar('type', { length: 50 }).default('work').notNull(), // work, personal, other
    isPrimary: boolean('is_primary').default(false).notNull(),
    verified: boolean('verified').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('contact_emails_contact_idx').on(table.contactId),
    index('contact_emails_proj_idx').on(table.projectId, table.email),
  ],
);

export const tags = pgTable(
  'tags',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    color: varchar('color', { length: 50 }).default('#1b59f8').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('tags_project_name_idx').on(table.projectId, table.name),
    index('tags_project_idx').on(table.projectId),
  ],
);

export const contactTags = pgTable(
  'contact_tags',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    contactId: uuid('contact_id')
      .notNull()
      .references(() => contacts.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('contact_tag_unique_idx').on(table.contactId, table.tagId),
    index('contact_tags_contact_idx').on(table.contactId),
    index('contact_tags_tag_idx').on(table.tagId),
    index('contact_tags_project_idx').on(table.projectId),
  ],
);

export const customFieldDefinitions = pgTable(
  'custom_field_definitions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    key: varchar('key', { length: 100 }).notNull(),
    type: varchar('type', { length: 50 }).notNull(), // TEXT, NUMBER, BOOLEAN, DATE, SELECT, MULTI_SELECT
    required: boolean('required').default(false).notNull(),
    options: jsonb('options').default([]).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('custom_fields_proj_key_idx').on(table.projectId, table.key),
    index('custom_fields_proj_idx').on(table.projectId),
  ],
);

export const customFieldValues = pgTable(
  'custom_field_values',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    definitionId: uuid('definition_id')
      .notNull()
      .references(() => customFieldDefinitions.id, { onDelete: 'cascade' }),
    contactId: uuid('contact_id')
      .notNull()
      .references(() => contacts.id, { onDelete: 'cascade' }),
    value: jsonb('value'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('custom_field_val_unique_idx').on(table.definitionId, table.contactId),
    index('custom_field_val_contact_idx').on(table.contactId),
  ],
);

export const contactNotes = pgTable(
  'contact_notes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    contactId: uuid('contact_id')
      .notNull()
      .references(() => contacts.id, { onDelete: 'cascade' }),
    authorUserId: uuid('author_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('contact_notes_contact_idx').on(table.contactId, table.createdAt),
    index('contact_notes_proj_idx').on(table.projectId),
  ],
);

export const contactActivities = pgTable(
  'contact_activities',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    contactId: uuid('contact_id')
      .notNull()
      .references(() => contacts.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 50 }).notNull(), // CONTACT_CREATED, CONTACT_UPDATED, MESSAGE_RECEIVED, MESSAGE_SENT, AI_REPLY, CONVERSATION_CREATED, CONVERSATION_ASSIGNED, CONVERSATION_RESOLVED, TAG_ADDED, TAG_REMOVED, NOTE_ADDED, LEAD_SCORE_CHANGED
    actorId: uuid('actor_id'),
    actorName: varchar('actor_name', { length: 255 }),
    description: text('description').notNull(),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('contact_act_contact_idx').on(table.contactId, table.createdAt),
    index('contact_act_proj_idx').on(table.projectId),
  ],
);

export const conversations = pgTable(
  'conversations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id')
      .references(() => projects.id, { onDelete: 'cascade' }),
    whatsappPhoneNumberId: uuid('whatsapp_phone_number_id')
      .references(() => whatsappPhoneNumbers.id, { onDelete: 'cascade' }),
    contactId: uuid('contact_id')
      .notNull()
      .references(() => contacts.id, { onDelete: 'cascade' }),
    status: varchar('status', { length: 50 }).default('open').notNull(), // open, pending, resolved, closed
    channel: varchar('channel', { length: 50 }).default('whatsapp').notNull(),
    handlingMode: varchar('handling_mode', { length: 50 }).default('AI_HANDLING').notNull(), // AI_HANDLING, HUMAN_HANDLING, HYBRID
    priority: varchar('priority', { length: 20 }).default('medium').notNull(),
    assignedUserId: uuid('assigned_user_id').references(() => users.id, { onDelete: 'set null' }),
    assignedAgentId: uuid('assigned_agent_id'),
    aiAutopilot: boolean('ai_autopilot').default(true).notNull(),
    lastMessageAt: timestamp('last_message_at', { withTimezone: true }).defaultNow().notNull(),
    lastMessagePreview: text('last_message_preview'),
    unreadCount: integer('unread_count').default(0).notNull(),
    windowExpiresAt: timestamp('window_expires_at', { withTimezone: true }), // 24hr customer service window
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    escalationReason: text('escalation_reason'),
    metadata: jsonb('metadata').default({}),
    firstResponseTimeSeconds: integer('first_response_time_seconds'),
    resolutionTimeSeconds: integer('resolution_time_seconds'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('workspace_phone_contact_conv_idx').on(table.workspaceId, table.whatsappPhoneNumberId, table.contactId),
    index('conversation_workspace_last_msg_idx').on(table.workspaceId, table.lastMessageAt),
    index('conversation_assigned_user_idx').on(table.workspaceId, table.assignedUserId),
    index('conversation_project_status_idx').on(table.projectId, table.status),
    index('conversation_project_last_msg_idx').on(table.projectId, table.lastMessageAt),
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
    projectId: uuid('project_id')
      .references(() => projects.id, { onDelete: 'cascade' }),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    metaMessageId: varchar('meta_message_id', { length: 255 }).unique(),
    externalMessageId: varchar('external_message_id', { length: 255 }),
    idempotencyKey: varchar('idempotency_key', { length: 255 }),
    replyToMessageId: uuid('reply_to_message_id'),
    direction: varchar('direction', { length: 20 }).notNull(), // inbound, outbound
    senderType: varchar('sender_type', { length: 20 }).notNull(), // customer, user, ai_agent, system, automation
    senderId: uuid('sender_id'),
    type: varchar('type', { length: 50 }).default('text').notNull(), // text, image, document, audio, video, template, interactive, call_event, internal_note
    body: text('body'),
    caption: text('caption'),
    mediaUrl: text('media_url'),
    mediaMimeType: varchar('media_mime_type', { length: 100 }),
    mediaSha256: varchar('media_sha256', { length: 100 }),
    mediaMetadata: jsonb('media_metadata').default({}),
    interactivePayload: jsonb('interactive_payload'),
    templateName: varchar('template_name', { length: 100 }),
    templateParams: jsonb('template_params'),
    status: varchar('status', { length: 50 }).default('pending').notNull(), // queued, pending, sent, delivered, read, failed
    errorCode: varchar('error_code', { length: 50 }),
    errorMessage: text('error_message'),
    metadata: jsonb('metadata').default({}),
    isInternal: boolean('is_internal').default(false).notNull(),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('msg_conversation_created_idx').on(table.conversationId, table.createdAt),
    index('msg_workspace_idx').on(table.workspaceId),
    index('msg_project_created_idx').on(table.projectId, table.createdAt),
  ],
);

export const internalNotes = pgTable(
  'internal_notes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('internal_notes_conv_idx').on(table.conversationId, table.createdAt),
    index('internal_notes_proj_idx').on(table.projectId),
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
