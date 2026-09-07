import { pgTable, uuid, varchar, text, timestamp, boolean, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { workspaces } from './tenants';

export const whatsappAccounts = pgTable(
  'whatsapp_accounts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    wabaId: varchar('waba_id', { length: 100 }).notNull(),
    businessId: varchar('business_id', { length: 100 }),
    name: varchar('name', { length: 255 }),
    currency: varchar('currency', { length: 10 }).default('USD'),
    timezoneId: varchar('timezone_id', { length: 50 }).default('UTC'),
    encryptedAccessToken: text('encrypted_access_token').notNull(),
    tokenIv: varchar('token_iv', { length: 64 }),
    tokenTag: varchar('token_tag', { length: 64 }),
    status: varchar('status', { length: 50 }).default('connected').notNull(),
    webhookVerifyToken: varchar('webhook_verify_token', { length: 100 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('workspace_waba_idx').on(table.workspaceId, table.wabaId),
    index('whatsapp_account_workspace_idx').on(table.workspaceId),
  ],
);

export const whatsappCredentials = pgTable(
  'whatsapp_credentials',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    whatsappAccountId: uuid('whatsapp_account_id')
      .notNull()
      .references(() => whatsappAccounts.id, { onDelete: 'cascade' }),
    systemUserId: varchar('system_user_id', { length: 100 }),
    encryptedAccessToken: text('encrypted_access_token').notNull(),
    tokenIv: varchar('token_iv', { length: 64 }).notNull(),
    tokenTag: varchar('token_tag', { length: 64 }).notNull(),
    tokenType: varchar('token_type', { length: 50 }).default('SYSTEM_USER').notNull(),
    tokenScope: text('token_scope').default('whatsapp_business_messaging,whatsapp_business_management'),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    lastValidatedAt: timestamp('last_validated_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('whatsapp_credentials_account_idx').on(table.whatsappAccountId),
    index('whatsapp_credentials_ws_idx').on(table.workspaceId),
  ],
);

export const whatsappPhoneNumbers = pgTable(
  'whatsapp_phone_numbers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    whatsappAccountId: uuid('whatsapp_account_id')
      .notNull()
      .references(() => whatsappAccounts.id, { onDelete: 'cascade' }),
    phoneNumberId: varchar('phone_number_id', { length: 100 }).notNull().unique(),
    displayPhoneNumber: varchar('display_phone_number', { length: 50 }).notNull(),
    verifiedName: varchar('verified_name', { length: 255 }),
    qualityRating: varchar('quality_rating', { length: 50 }).default('UNKNOWN'),
    codeVerificationStatus: varchar('code_verification_status', { length: 50 }).default('NOT_VERIFIED'),
    accountMode: varchar('account_mode', { length: 50 }).default('LIVE'),
    status: varchar('status', { length: 50 }).default('PENDING').notNull(),
    isDefault: boolean('is_default').default(false).notNull(),
    isCallingEnabled: boolean('is_calling_enabled').default(false).notNull(),
    callingPermissionPolicy: varchar('calling_permission_policy', { length: 50 }).default('ALWAYS_PERMITTED'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('phone_number_workspace_idx').on(table.workspaceId),
    index('phone_number_id_idx').on(table.phoneNumberId),
  ],
);

export const phoneNumberCertificates = pgTable(
  'phone_number_certificates',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    whatsappPhoneNumberId: uuid('whatsapp_phone_number_id')
      .notNull()
      .references(() => whatsappPhoneNumbers.id, { onDelete: 'cascade' }),
    encryptedPin: text('encrypted_pin'),
    pinIv: varchar('pin_iv', { length: 64 }),
    pinTag: varchar('pin_tag', { length: 64 }),
    certStatus: varchar('cert_status', { length: 50 }).default('REGISTERED').notNull(),
    lastRegisteredAt: timestamp('last_registered_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('phone_cert_phone_idx').on(table.whatsappPhoneNumberId),
  ],
);
