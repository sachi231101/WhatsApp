// Meta Graph API and Embedded Signup Constants
export const DEFAULT_GRAPH_API_VERSION = process.env.FB_GRAPH_API_VERSION || 'v22.0';
export const META_GRAPH_BASE_URL = `https://graph.facebook.com/${DEFAULT_GRAPH_API_VERSION}`;
export const META_OAUTH_TOKEN_URL = `https://graph.facebook.com/${DEFAULT_GRAPH_API_VERSION}/oauth/access_token`;
export const FACEBOOK_JS_SDK_URL = 'https://connect.facebook.net/en_US/sdk.js';

export const META_SCOPES = [
  'whatsapp_business_messaging',
  'whatsapp_business_management',
  'business_management',
] as const;

export type MetaScope = (typeof META_SCOPES)[number];
