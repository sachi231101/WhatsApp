import { pgTable, uuid, varchar, text, timestamp, integer, boolean, numeric, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { workspaces } from './tenants';
import { contacts, conversations } from './messaging';

export const workflows = pgTable(
  'workflows',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    triggerType: varchar('trigger_type', { length: 50 }).notNull(), // inbound_message, care_window_closing, call_ended, tag_added
    isActive: boolean('is_active').default(false).notNull(),
    publishedVersionId: uuid('published_version_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('workflows_ws_idx').on(table.workspaceId),
  ],
);

export const workflowVersions = pgTable(
  'workflow_versions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    workflowId: uuid('workflow_id')
      .notNull()
      .references(() => workflows.id, { onDelete: 'cascade' }),
    versionNumber: integer('version_number').notNull(),
    status: varchar('status', { length: 50 }).default('draft').notNull(), // draft, published, archived
    definition: jsonb('definition').default({}).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('wf_versions_num_idx').on(table.workflowId, table.versionNumber),
    index('wf_versions_ws_idx').on(table.workspaceId),
  ],
);

export const workflowNodes = pgTable(
  'workflow_nodes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    workflowVersionId: uuid('workflow_version_id')
      .notNull()
      .references(() => workflowVersions.id, { onDelete: 'cascade' }),
    nodeKey: varchar('node_key', { length: 100 }).notNull(),
    nodeType: varchar('node_type', { length: 50 }).notNull(), // trigger, condition, ai_generate, send_whatsapp, time_delay, assign_agent
    config: jsonb('config').default({}).notNull(),
    positionX: numeric('position_x', { precision: 10, scale: 2 }),
    positionY: numeric('position_y', { precision: 10, scale: 2 }),
  },
  (table) => [
    uniqueIndex('wf_nodes_key_idx').on(table.workflowVersionId, table.nodeKey),
  ],
);

export const workflowEdges = pgTable(
  'workflow_edges',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    workflowVersionId: uuid('workflow_version_id')
      .notNull()
      .references(() => workflowVersions.id, { onDelete: 'cascade' }),
    sourceNodeId: uuid('source_node_id')
      .notNull()
      .references(() => workflowNodes.id, { onDelete: 'cascade' }),
    sourceHandle: varchar('source_handle', { length: 50 }).default('default'),
    targetNodeId: uuid('target_node_id')
      .notNull()
      .references(() => workflowNodes.id, { onDelete: 'cascade' }),
  },
  (table) => [
    index('wf_edges_version_idx').on(table.workflowVersionId),
  ],
);

export const workflowExecutions = pgTable(
  'workflow_executions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    workflowVersionId: uuid('workflow_version_id')
      .notNull()
      .references(() => workflowVersions.id, { onDelete: 'cascade' }),
    contactId: uuid('contact_id').references(() => contacts.id, { onDelete: 'set null' }),
    conversationId: uuid('conversation_id').references(() => conversations.id, { onDelete: 'set null' }),
    triggerPayload: jsonb('trigger_payload').notNull(),
    contextState: jsonb('context_state').default({}).notNull(),
    status: varchar('status', { length: 50 }).default('running').notNull(), // running, completed, failed, paused_delay
    startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    errorMessage: text('error_message'),
  },
  (table) => [
    index('wf_exec_ws_status_idx').on(table.workspaceId, table.status),
    index('wf_exec_conv_idx').on(table.conversationId),
  ],
);

export const workflowExecutionSteps = pgTable(
  'workflow_execution_steps',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    workflowExecutionId: uuid('workflow_execution_id')
      .notNull()
      .references(() => workflowExecutions.id, { onDelete: 'cascade' }),
    nodeId: uuid('node_id')
      .notNull()
      .references(() => workflowNodes.id, { onDelete: 'cascade' }),
    inputPayload: jsonb('input_payload'),
    outputPayload: jsonb('output_payload'),
    status: varchar('status', { length: 50 }).notNull(), // success, failed, skipped
    executionDurationMs: integer('execution_duration_ms'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('wf_steps_exec_idx').on(table.workflowExecutionId),
  ],
);
