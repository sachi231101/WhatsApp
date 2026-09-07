// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

/**
 * MOCK DATA MODULE
 * ─────────────────────────────────────────────────────────────────────────────
 * Used when MOCK_FB=true is set in .env.local.
 * Provides realistic fake responses for every FB Graph API call so you can
 * develop and test the UI/UX without real Facebook credentials.
 *
 * To enable:  Add  MOCK_FB=true  to your .env.local, then restart the server.
 * To disable: Remove MOCK_FB=true (or set to false) and add real credentials.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type {
  AppDetails,
  WabaWithDetails,
  ClientPhone,
  PageWithDetails,
  AdAccountWithDetails,
  DatasetWithDetails,
  CatalogWithDetails,
  InstagramAccountWithDetails,
  MessageTemplate,
} from '@/app/types/api';

// ─── App ─────────────────────────────────────────────────────────────────────

export const MOCK_APP_DETAILS: AppDetails & { _configError?: boolean } = {
  id: '1234567890123456',
  name: 'My WhatsApp Business App',
  logo_url: undefined,
  client_config: {},
  app_domains: ['example.com'],
  app_type: 'BUSINESS',
  company: 'My Company',
  link: 'https://example.com',
  config_ids: [
    { id: 'config_001', name: 'Default Config' },
    { id: 'config_002', name: 'Marketing Config' },
  ],
};

// ─── WABAs ───────────────────────────────────────────────────────────────────

export const MOCK_WABAS: WabaWithDetails[] = [
  {
    id: 'waba_001',
    name: 'Acme Corp WABA',
    account_review_status: 'APPROVED',
    ownership_type: 'DIRECT',
    subscribed_apps: {
      data: [{ id: '1234567890123456', name: 'My WhatsApp Business App' }],
    },
    business_verification_status: 'verified',
    country: 'IN',
    currency: 'INR',
    timezone_id: '1',
    is_enabled_for_insights: true,
    phone_numbers: {
      data: [
        { id: 'phone_001', display_phone_number: '+91 98765 43210', verified_name: 'Acme Corp', quality_rating: 'GREEN', platform_type: 'CLOUD_API', throughput: { level: 'STANDARD' }, last_onboarded_time: '2025-01-01T00:00:00Z' },
        { id: 'phone_002', display_phone_number: '+91 91234 56789', verified_name: 'Acme Support', quality_rating: 'GREEN', platform_type: 'CLOUD_API', throughput: { level: 'STANDARD' }, last_onboarded_time: '2025-03-15T00:00:00Z' },
      ],
    },
    business_id: 'biz_001',
    access_token: 'mock_access_token_001',
  },
  {
    id: 'waba_002',
    name: 'Beta Retail WABA',
    account_review_status: 'APPROVED',
    ownership_type: 'DIRECT',
    subscribed_apps: { data: [] },
    business_verification_status: 'verified',
    country: 'US',
    currency: 'USD',
    timezone_id: '1',
    is_enabled_for_insights: false,
    phone_numbers: {
      data: [
        { id: 'phone_003', display_phone_number: '+1 555 123 4567', verified_name: 'Beta Retail', quality_rating: 'YELLOW', platform_type: 'CLOUD_API', throughput: { level: 'STANDARD' }, last_onboarded_time: '2025-06-01T00:00:00Z' },
      ],
    },
    business_id: 'biz_002',
    access_token: 'mock_access_token_002',
  },
];

// ─── Phones ──────────────────────────────────────────────────────────────────

export const MOCK_PHONES: ClientPhone[] = [
  {
    id: 'phone_001',
    display_phone_number: '+91 98765 43210',
    status: 'CONNECTED',
    account_mode: 'LIVE',
    code_verification_status: 'VERIFIED',
    is_on_biz_app: false,
    certificate: '',
    wabaId: 'waba_001',
    isAckBotEnabled: false,
  },
  {
    id: 'phone_002',
    display_phone_number: '+91 91234 56789',
    status: 'CONNECTED',
    account_mode: 'LIVE',
    code_verification_status: 'VERIFIED',
    is_on_biz_app: true,
    certificate: '',
    wabaId: 'waba_001',
    isAckBotEnabled: true,
  },
  {
    id: 'phone_003',
    display_phone_number: '+1 555 123 4567',
    status: 'DISCONNECTED',
    account_mode: 'SANDBOX',
    code_verification_status: 'NOT_VERIFIED',
    is_on_biz_app: false,
    certificate: '',
    wabaId: 'waba_002',
    isAckBotEnabled: false,
  },
];

// ─── Pages ───────────────────────────────────────────────────────────────────

export const MOCK_PAGES: PageWithDetails[] = [
  {
    page_id: 'page_001',
    access_token: 'mock_page_token_001',
    business_id: 'biz_001',
    name: 'Acme Corp Facebook Page',
    ad_campaign: 'Summer Sale 2026',
  },
  {
    page_id: 'page_002',
    access_token: 'mock_page_token_002',
    business_id: 'biz_002',
    name: 'Beta Retail Page',
    ad_campaign: 'No Ad Campaign',
  },
];

// ─── Ad Accounts ─────────────────────────────────────────────────────────────

export const MOCK_AD_ACCOUNTS: AdAccountWithDetails[] = [
  {
    ad_account_id: 'act_111222333444',
    access_token: 'mock_ad_token_001',
    business_id: 'biz_001',
    name: 'Acme Corp Ad Account',
  },
  {
    ad_account_id: 'act_555666777888',
    access_token: 'mock_ad_token_002',
    business_id: 'biz_002',
    name: 'Beta Retail Ads',
  },
];

// ─── Datasets ────────────────────────────────────────────────────────────────

export const MOCK_DATASETS: DatasetWithDetails[] = [
  {
    id: 'dataset_001',
    name: 'Main Conversions Dataset',
    code: 'MOCK_PIXEL_CODE_001',
    status: 'ACTIVE',
    last_fired_time: '2026-09-01T10:00:00Z',
    access_token: 'mock_dataset_token_001',
    business_id: 'biz_001',
  },
];

// ─── Catalogs ────────────────────────────────────────────────────────────────

export const MOCK_CATALOGS: CatalogWithDetails[] = [
  {
    id: 'catalog_001',
    name: 'Acme Product Catalog',
    access_token: 'mock_catalog_token_001',
    business_id: 'biz_001',
  },
  {
    id: 'catalog_002',
    name: 'Beta Retail Catalog',
    access_token: 'mock_catalog_token_002',
    business_id: 'biz_002',
  },
];

// ─── Instagram Accounts ──────────────────────────────────────────────────────

export const MOCK_INSTAGRAM_ACCOUNTS: InstagramAccountWithDetails[] = [
  {
    id: 'ig_001',
    username: 'acme_corp_official',
    access_token: 'mock_ig_token_001',
    business_id: 'biz_001',
  },
];

// ─── Message Templates ───────────────────────────────────────────────────────

export const MOCK_MESSAGE_TEMPLATES: MessageTemplate[] = [
  {
    id: 'tpl_001',
    name: 'order_confirmation',
    language: 'en_US',
    status: 'APPROVED',
    category: 'UTILITY',
    components: [
      { type: 'HEADER', format: 'TEXT', text: 'Order Confirmation' },
      { type: 'BODY', text: 'Hi {{1}}, your order #{{2}} has been confirmed! It will be delivered by {{3}}.' },
      { type: 'FOOTER', text: 'Thank you for shopping with us.' },
    ],
  },
  {
    id: 'tpl_002',
    name: 'shipping_update',
    language: 'en_US',
    status: 'APPROVED',
    category: 'UTILITY',
    components: [
      { type: 'BODY', text: 'Your order #{{1}} has been shipped! Track it here: {{2}}' },
    ],
  },
  {
    id: 'tpl_003',
    name: 'welcome_message',
    language: 'en_US',
    status: 'APPROVED',
    category: 'MARKETING',
    components: [
      { type: 'HEADER', format: 'TEXT', text: 'Welcome to Acme Corp! 🎉' },
      { type: 'BODY', text: 'Hi {{1}}, welcome aboard! Use code WELCOME10 for 10% off your first order.' },
      { type: 'BUTTONS', buttons: [{ type: 'URL', text: 'Shop Now', url: 'https://example.com/shop' }] },
    ],
  },
];

// ─── Helper ──────────────────────────────────────────────────────────────────

export function isMockMode(): boolean {
  return process.env.MOCK_FB === 'true';
}
