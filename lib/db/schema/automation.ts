import { pgTable, uuid, varchar, text, timestamp, integer, numeric, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { workspaces, users } from './tenants';
import { projects } from './projects';
import { contacts, conversations } from './messaging';

// ============================================================================
// 1. AUTOMATION TABLE
// ============================================================================
export const automations = pgTable(
  'automations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    status: varchar('status', { length: 50 }).default('DRAFT').notNull(), // DRAFT, ACTIVE, PAUSED, ARCHIVED
    currentVersionId: uuid('current_version_id'),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_automations_ws').on(table.workspaceId),
    index('idx_automations_proj').on(table.projectId),
    index('idx_automations_status').on(table.status),
    index('idx_automations_ws_proj').on(table.workspaceId, table.projectId),
  ],
);

// ============================================================================
// 2. AUTOMATION VERSION TABLE
// ============================================================================
export const automationVersions = pgTable(
  'automation_versions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    automationId: uuid('automation_id')
      .notNull()
      .references(() => automations.id, { onDelete: 'cascade' }),
    versionNumber: integer('version_number').notNull(),
    status: varchar('status', { length: 50 }).default('DRAFT').notNull(), // DRAFT, PUBLISHED, ARCHIVED
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    publishedAt: timestamp('published_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('idx_auto_versions_num_uq').on(table.automationId, table.versionNumber),
    index('idx_auto_versions_auto').on(table.automationId),
    index('idx_auto_versions_status').on(table.status),
  ],
);

// ============================================================================
// 3. AUTOMATION NODES TABLE
// ============================================================================
export const automationNodes = pgTable(
  'automation_nodes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    automationVersionId: uuid('automation_version_id')
      .notNull()
      .references(() => automationVersions.id, { onDelete: 'cascade' }),
    nodeKey: varchar('node_key', { length: 100 }).notNull(),
    type: varchar('type', { length: 100 }).notNull(), // trigger, condition, action, send_whatsapp, etc.
    label: varchar('label', { length: 255 }).notNull(),
    positionX: numeric('position_x', { precision: 10, scale: 2 }).default('0.00').notNull(),
    positionY: numeric('position_y', { precision: 10, scale: 2 }).default('0.00').notNull(),
    configuration: jsonb('configuration').default({}).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_auto_nodes_key_uq').on(table.automationVersionId, table.nodeKey),
    index('idx_auto_nodes_version').on(table.automationVersionId),
  ],
);

// ============================================================================
// 4. AUTOMATION EDGES TABLE
// ============================================================================
export const automationEdges = pgTable(
  'automation_edges',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    automationVersionId: uuid('automation_version_id')
      .notNull()
      .references(() => automationVersions.id, { onDelete: 'cascade' }),
    sourceNodeId: uuid('source_node_id')
      .notNull()
      .references(() => automationNodes.id, { onDelete: 'cascade' }),
    targetNodeId: uuid('target_node_id')
      .notNull()
      .references(() => automationNodes.id, { onDelete: 'cascade' }),
    sourceHandle: varchar('source_handle', { length: 100 }),
    targetHandle: varchar('target_handle', { length: 100 }),
    conditionKey: varchar('condition_key', { length: 100 }), // YES, NO, TRUE, FALSE, custom branches
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_auto_edges_version').on(table.automationVersionId),
    index('idx_auto_edges_source').on(table.sourceNodeId),
    index('idx_auto_edges_target').on(table.targetNodeId),
  ],
);

// ============================================================================
// 5. EXECUTION TABLE
// ============================================================================
export const automationExecutions = pgTable(
  'automation_executions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    automationId: uuid('automation_id')
      .notNull()
      .references(() => automations.id, { onDelete: 'cascade' }),
    automationVersionId: uuid('automation_version_id')
      .notNull()
      .references(() => automationVersions.id, { onDelete: 'cascade' }),
    triggerType: varchar('trigger_type', { length: 100 }).notNull(),
    triggerEventId: varchar('trigger_event_id', { length: 255 }),
    idempotencyKey: varchar('idempotency_key', { length: 255 }),
    conversationId: uuid('conversation_id').references(() => conversations.id, { onDelete: 'set null' }),
    contactId: uuid('contact_id').references(() => contacts.id, { onDelete: 'set null' }),
    status: varchar('status', { length: 50 }).default('QUEUED').notNull(), // QUEUED, RUNNING, WAITING, COMPLETED, FAILED, CANCELLED
    currentNodeId: uuid('current_node_id').references(() => automationNodes.id, { onDelete: 'set null' }),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    failedAt: timestamp('failed_at', { withTimezone: true }),
    errorCode: varchar('error_code', { length: 100 }),
    errorMessage: text('error_message'),
    metadata: jsonb('metadata').default({}).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_auto_exec_ws_created').on(table.workspaceId, table.createdAt),
    index('idx_auto_exec_proj_created').on(table.projectId, table.createdAt),
    index('idx_auto_exec_auto_created').on(table.automationId, table.createdAt),
    index('idx_auto_exec_status').on(table.status),
    index('idx_auto_exec_trigger_event').on(table.projectId, table.triggerEventId),
    uniqueIndex('idx_auto_exec_idempotency').on(table.workspaceId, table.projectId, table.idempotencyKey),
  ],
);

// ============================================================================
// 6. EXECUTION STEP TABLE
// ============================================================================
export const automationExecutionSteps = pgTable(
  'automation_execution_steps',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    executionId: uuid('execution_id')
      .notNull()
      .references(() => automationExecutions.id, { onDelete: 'cascade' }),
    nodeId: uuid('node_id')
      .notNull()
      .references(() => automationNodes.id, { onDelete: 'cascade' }),
    status: varchar('status', { length: 50 }).default('PENDING').notNull(), // PENDING, RUNNING, COMPLETED, FAILED, SKIPPED
    input: jsonb('input').default({}).notNull(),
    output: jsonb('output').default({}).notNull(),
    errorCode: varchar('error_code', { length: 100 }),
    errorMessage: text('error_message'),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_auto_exec_steps_exec').on(table.executionId),
    index('idx_auto_exec_steps_node').on(table.nodeId),
  ],
);

// ============================================================================
// 7. ACTION IDEMPOTENCY TABLE
// ============================================================================
export const actionIdempotency = pgTable(
  'action_idempotency',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    executionId: uuid('execution_id')
      .notNull()
      .references(() => automationExecutions.id, { onDelete: 'cascade' }),
    nodeId: uuid('node_id').notNull(),
    idempotencyKey: varchar('idempotency_key', { length: 255 }).notNull(),
    actionType: varchar('action_type', { length: 100 }).notNull(),
    status: varchar('status', { length: 50 }).default('COMPLETED').notNull(),
    sideEffectId: varchar('side_effect_id', { length: 255 }),
    output: jsonb('output').default({}).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_action_idempotency_key').on(table.projectId, table.idempotencyKey),
    index('idx_action_idempotency_exec').on(table.executionId),
  ],
);

// ============================================================================
// 8. TASKS TABLE (Minimal CRM domain abstraction)
// ============================================================================
export const tasks = pgTable(
  'tasks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    contactId: uuid('contact_id').references(() => contacts.id, { onDelete: 'set null' }),
    conversationId: uuid('conversation_id').references(() => conversations.id, { onDelete: 'set null' }),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    assigneeUserId: uuid('assignee_user_id').references(() => users.id, { onDelete: 'set null' }),
    priority: varchar('priority', { length: 20 }).default('medium').notNull(),
    status: varchar('status', { length: 20 }).default('open').notNull(),
    dueDate: timestamp('due_date', { withTimezone: true }),
    source: varchar('source', { length: 50 }).default('AUTOMATION').notNull(),
    idempotencyKey: varchar('idempotency_key', { length: 255 }),
    metadata: jsonb('metadata').default({}).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_tasks_idempotency').on(table.projectId, table.idempotencyKey),
    index('idx_tasks_proj_status').on(table.projectId, table.status),
    index('idx_tasks_proj_created').on(table.projectId, table.createdAt),
  ],
);

// Backward-compatibility aliases for legacy references if any
export const workflows = automations;
export const workflowVersions = automationVersions;
export const workflowNodes = automationNodes;
export const workflowEdges = automationEdges;
export const workflowExecutions = automationExecutions;
export const workflowExecutionSteps = automationExecutionSteps;
