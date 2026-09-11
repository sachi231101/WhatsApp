import { pgTable, uuid, varchar, text, timestamp, integer, boolean, numeric, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { tenants, workspaces, users } from './tenants';

// ─── PLANS ───────────────────────────────────────────────────────────────────
export const plans = pgTable('plans', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  description: text('description'),
  price: numeric('price', { precision: 10, scale: 2 }).notNull().default('0'),
  currency: varchar('currency', { length: 10 }).notNull().default('USD'),
  billingCycle: varchar('billing_cycle', { length: 50 }).notNull().default('monthly'), // monthly, yearly, lifetime
  taxPercent: numeric('tax_percent', { precision: 5, scale: 2 }).default('0'),
  isPopular: boolean('is_popular').default(false).notNull(),
  status: varchar('status', { length: 50 }).notNull().default('active'), // active, archived, draft
  visibility: varchar('visibility', { length: 50 }).notNull().default('public'), // public, private, hidden
  trialDays: integer('trial_days').default(0).notNull(),
  isTrial: boolean('is_trial').default(false).notNull(),
  features: jsonb('features').default({}).notNull(), // entitlements map
  limits: jsonb('limits').default({}).notNull(), // numeric limits
  metadata: jsonb('metadata').default({}).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('plans_status_idx').on(t.status),
  index('plans_slug_idx').on(t.slug),
]);

export const planFeatures = pgTable('plan_features', {
  id: uuid('id').defaultRandom().primaryKey(),
  planId: uuid('plan_id').notNull().references(() => plans.id, { onDelete: 'cascade' }),
  featureKey: varchar('feature_key', { length: 100 }).notNull(), // whatsapp_numbers, ai_agents, etc
  featureCategory: varchar('feature_category', { length: 50 }).notNull(), // whatsapp, contacts, ai, campaigns, automation, team, commerce
  displayName: varchar('display_name', { length: 255 }).notNull(),
  valueType: varchar('value_type', { length: 20 }).notNull().default('numeric'), // boolean, numeric, unlimited
  booleanValue: boolean('boolean_value'),
  numericValue: integer('numeric_value'),
  isUnlimited: boolean('is_unlimited').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  uniqueIndex('plan_feature_key_idx').on(t.planId, t.featureKey),
  index('plan_features_plan_idx').on(t.planId),
]);

// ─── SUBSCRIPTIONS ───────────────────────────────────────────────────────────
export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'set null' }),
  planId: uuid('plan_id').references(() => plans.id, { onDelete: 'restrict' }),
  status: varchar('status', { length: 50 }).notNull().default('trial'), // trial, active, past_due, cancelled, suspended, expired, paused
  billingCycle: varchar('billing_cycle', { length: 50 }).notNull().default('monthly'),
  currentPeriodStart: timestamp('current_period_start', { withTimezone: true }),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
  trialStart: timestamp('trial_start', { withTimezone: true }),
  trialEnd: timestamp('trial_end', { withTimezone: true }),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  suspendedAt: timestamp('suspended_at', { withTimezone: true }),
  pausedAt: timestamp('paused_at', { withTimezone: true }),
  overrideLimits: jsonb('override_limits').default({}).notNull(),
  metadata: jsonb('metadata').default({}).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('subscriptions_tenant_idx').on(t.tenantId),
  index('subscriptions_workspace_idx').on(t.workspaceId),
  index('subscriptions_status_idx').on(t.status),
  index('subscriptions_plan_idx').on(t.planId),
]);

// ─── INVOICES ────────────────────────────────────────────────────────────────
export const invoices = pgTable('invoices', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'set null' }),
  subscriptionId: uuid('subscription_id').references(() => subscriptions.id, { onDelete: 'set null' }),
  invoiceNumber: varchar('invoice_number', { length: 100 }).notNull().unique(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 10 }).notNull().default('USD'),
  taxAmount: numeric('tax_amount', { precision: 10, scale: 2 }).default('0'),
  totalAmount: numeric('total_amount', { precision: 10, scale: 2 }).notNull(),
  status: varchar('status', { length: 50 }).notNull().default('pending'), // paid, pending, overdue, cancelled, refunded
  dueDate: timestamp('due_date', { withTimezone: true }),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  metadata: jsonb('metadata').default({}).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('invoices_tenant_idx').on(t.tenantId),
  index('invoices_status_idx').on(t.status),
  index('invoices_subscription_idx').on(t.subscriptionId),
]);

// ─── PAYMENTS ────────────────────────────────────────────────────────────────
export const payments = pgTable('payments', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'set null' }),
  subscriptionId: uuid('subscription_id').references(() => subscriptions.id, { onDelete: 'set null' }),
  invoiceId: uuid('invoice_id').references(() => invoices.id, { onDelete: 'set null' }),
  externalPaymentId: varchar('external_payment_id', { length: 255 }),
  gateway: varchar('gateway', { length: 50 }).notNull().default('razorpay'), // razorpay, stripe
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 10 }).notNull().default('USD'),
  status: varchar('status', { length: 50 }).notNull().default('pending'), // successful, pending, failed, refunded, disputed
  gatewayResponse: jsonb('gateway_response').default({}).notNull(),
  refundAmount: numeric('refund_amount', { precision: 10, scale: 2 }).default('0'),
  metadata: jsonb('metadata').default({}).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('payments_tenant_idx').on(t.tenantId),
  index('payments_status_idx').on(t.status),
  index('payments_gateway_idx').on(t.gateway),
  index('payments_subscription_idx').on(t.subscriptionId),
]);

// ─── ADMIN AUDIT LOGS (platform-scoped, workspace may be null) ─────────────
export const adminAuditLogs = pgTable('admin_audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  adminUserId: uuid('admin_user_id').references(() => users.id, { onDelete: 'set null' }),
  adminEmail: varchar('admin_email', { length: 255 }),
  action: varchar('action', { length: 100 }).notNull(),
  entityType: varchar('entity_type', { length: 100 }).notNull(),
  entityId: varchar('entity_id', { length: 255 }),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'set null' }),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'set null' }),
  oldValues: jsonb('old_values'),
  newValues: jsonb('new_values'),
  diff: jsonb('diff'),
  reason: text('reason'),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  metadata: jsonb('metadata').default({}).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('admin_audit_action_idx').on(t.action),
  index('admin_audit_admin_idx').on(t.adminUserId),
  index('admin_audit_created_idx').on(t.createdAt),
  index('admin_audit_entity_idx').on(t.entityType, t.entityId),
]);

// ─── META CONFIGURATION (platform-level, encrypted secrets) ─────────────────
export const metaConfigurations = pgTable('meta_configurations', {
  id: uuid('id').defaultRandom().primaryKey(),
  appId: varchar('app_id', { length: 100 }),
  encryptedAppSecret: text('encrypted_app_secret'),
  appSecretIv: varchar('app_secret_iv', { length: 64 }),
  appSecretTag: varchar('app_secret_tag', { length: 64 }),
  embeddedSignupConfigId: varchar('embedded_signup_config_id', { length: 100 }),
  webhookUrl: text('webhook_url'),
  webhookVerifyToken: varchar('webhook_verify_token', { length: 255 }),
  encryptedVerifyToken: text('encrypted_verify_token'),
  verifyTokenIv: varchar('verify_token_iv', { length: 64 }),
  verifyTokenTag: varchar('verify_token_tag', { length: 64 }),
  systemUserId: varchar('system_user_id', { length: 100 }),
  encryptedSystemUserToken: text('encrypted_system_user_token'),
  systemUserTokenIv: varchar('system_user_token_iv', { length: 64 }),
  systemUserTokenTag: varchar('system_user_token_tag', { length: 64 }),
  apiVersion: varchar('api_version', { length: 20 }).default('v22.0'),
  environment: varchar('environment', { length: 20 }).default('production'),
  isActive: boolean('is_active').default(true).notNull(),
  lastVerifiedAt: timestamp('last_verified_at', { withTimezone: true }),
  metadata: jsonb('metadata').default({}).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── SYSTEM HEALTH SNAPSHOTS ─────────────────────────────────────────────────
export const systemHealth = pgTable('system_health', {
  id: uuid('id').defaultRandom().primaryKey(),
  subsystem: varchar('subsystem', { length: 100 }).notNull(), // api, database, redis, queue, workers, whatsapp_api, webhooks, ai_provider, payment_gateway, storage
  status: varchar('status', { length: 50 }).notNull().default('healthy'), // healthy, warning, degraded, down
  latencyMs: integer('latency_ms'),
  errorMessage: text('error_message'),
  metadata: jsonb('metadata').default({}).notNull(),
  checkedAt: timestamp('checked_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('system_health_subsystem_idx').on(t.subsystem),
  index('system_health_checked_idx').on(t.checkedAt),
]);

// ─── TENANT USAGE AGGREGATES (daily rollup) ──────────────────────────────────
export const tenantUsageAggregates = pgTable('tenant_usage_aggregates', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  metricType: varchar('metric_type', { length: 100 }).notNull(), // whatsapp_messages, ai_tokens, campaigns, automations, contacts
  quantity: integer('quantity').notNull().default(0),
  periodStart: timestamp('period_start', { withTimezone: true }).notNull(),
  periodEnd: timestamp('period_end', { withTimezone: true }).notNull(),
  metadata: jsonb('metadata').default({}).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('tenant_usage_agg_tenant_idx').on(t.tenantId, t.metricType),
  index('tenant_usage_agg_ws_idx').on(t.workspaceId, t.metricType),
]);

// ─── SUPPORT TICKETS (minimal) ───────────────────────────────────────────────
export const supportTickets = pgTable('support_tickets', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'set null' }),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'set null' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  subject: varchar('subject', { length: 255 }).notNull(),
  description: text('description').notNull(),
  category: varchar('category', { length: 100 }).default('general'),
  priority: varchar('priority', { length: 20 }).default('medium'),
  status: varchar('status', { length: 50 }).notNull().default('new'), // new, open, in_progress, resolved, closed
  assignedAdminId: uuid('assigned_admin_id').references(() => users.id, { onDelete: 'set null' }),
  metadata: jsonb('metadata').default({}).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('support_tickets_status_idx').on(t.status),
  index('support_tickets_tenant_idx').on(t.tenantId),
]);

// Types
export type Plan = typeof plans.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
