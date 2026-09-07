import { WORKSPACE_ROLES, type WorkspaceRole } from './roles';

export const PERMISSIONS = {
  // Workspace management
  WORKSPACE_VIEW: 'workspace:view',
  WORKSPACE_MANAGE: 'workspace:manage',
  WORKSPACE_DELETE: 'workspace:delete',

  // Team & Member management
  MEMBERS_VIEW: 'members:view',
  MEMBERS_INVITE: 'members:invite',
  MEMBERS_UPDATE_ROLE: 'members:update_role',
  MEMBERS_REMOVE: 'members:remove',

  // WhatsApp Business Integration
  WHATSAPP_VIEW: 'whatsapp:view',
  WHATSAPP_CONNECT: 'whatsapp:connect',
  WHATSAPP_MANAGE: 'whatsapp:manage',

  // Conversations & Messaging
  CONVERSATIONS_VIEW: 'conversations:view',
  CONVERSATIONS_MANAGE: 'conversations:manage',
  CONVERSATIONS_ASSIGN: 'conversations:assign',
  MESSAGES_READ: 'messages:read',
  MESSAGES_SEND: 'messages:send',

  // Contacts
  CONTACTS_VIEW: 'contacts:view',
  CONTACTS_MANAGE: 'contacts:manage',
  CONTACTS_EXPORT: 'contacts:export',

  // Templates
  TEMPLATES_VIEW: 'templates:view',
  TEMPLATES_MANAGE: 'templates:manage',

  // Settings
  SETTINGS_VIEW: 'settings:view',
  SETTINGS_MANAGE: 'settings:manage',
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/**
 * Permission matrix mapping each workspace role to granted capabilities.
 */
export const ROLE_PERMISSIONS: Record<WorkspaceRole, readonly PermissionCode[]> = {
  [WORKSPACE_ROLES.OWNER]: [
    PERMISSIONS.WORKSPACE_VIEW,
    PERMISSIONS.WORKSPACE_MANAGE,
    PERMISSIONS.WORKSPACE_DELETE,
    PERMISSIONS.MEMBERS_VIEW,
    PERMISSIONS.MEMBERS_INVITE,
    PERMISSIONS.MEMBERS_UPDATE_ROLE,
    PERMISSIONS.MEMBERS_REMOVE,
    PERMISSIONS.WHATSAPP_VIEW,
    PERMISSIONS.WHATSAPP_CONNECT,
    PERMISSIONS.WHATSAPP_MANAGE,
    PERMISSIONS.CONVERSATIONS_VIEW,
    PERMISSIONS.CONVERSATIONS_MANAGE,
    PERMISSIONS.CONVERSATIONS_ASSIGN,
    PERMISSIONS.MESSAGES_READ,
    PERMISSIONS.MESSAGES_SEND,
    PERMISSIONS.CONTACTS_VIEW,
    PERMISSIONS.CONTACTS_MANAGE,
    PERMISSIONS.CONTACTS_EXPORT,
    PERMISSIONS.TEMPLATES_VIEW,
    PERMISSIONS.TEMPLATES_MANAGE,
    PERMISSIONS.SETTINGS_VIEW,
    PERMISSIONS.SETTINGS_MANAGE,
  ],
  [WORKSPACE_ROLES.ADMIN]: [
    PERMISSIONS.WORKSPACE_VIEW,
    PERMISSIONS.WORKSPACE_MANAGE,
    PERMISSIONS.MEMBERS_VIEW,
    PERMISSIONS.MEMBERS_INVITE,
    PERMISSIONS.MEMBERS_UPDATE_ROLE,
    PERMISSIONS.MEMBERS_REMOVE,
    PERMISSIONS.WHATSAPP_VIEW,
    PERMISSIONS.WHATSAPP_CONNECT,
    PERMISSIONS.WHATSAPP_MANAGE,
    PERMISSIONS.CONVERSATIONS_VIEW,
    PERMISSIONS.CONVERSATIONS_MANAGE,
    PERMISSIONS.CONVERSATIONS_ASSIGN,
    PERMISSIONS.MESSAGES_READ,
    PERMISSIONS.MESSAGES_SEND,
    PERMISSIONS.CONTACTS_VIEW,
    PERMISSIONS.CONTACTS_MANAGE,
    PERMISSIONS.CONTACTS_EXPORT,
    PERMISSIONS.TEMPLATES_VIEW,
    PERMISSIONS.TEMPLATES_MANAGE,
    PERMISSIONS.SETTINGS_VIEW,
    PERMISSIONS.SETTINGS_MANAGE,
  ],
  [WORKSPACE_ROLES.MEMBER]: [
    PERMISSIONS.WORKSPACE_VIEW,
    PERMISSIONS.MEMBERS_VIEW,
    PERMISSIONS.WHATSAPP_VIEW,
    PERMISSIONS.CONVERSATIONS_VIEW,
    PERMISSIONS.CONVERSATIONS_MANAGE,
    PERMISSIONS.CONVERSATIONS_ASSIGN,
    PERMISSIONS.MESSAGES_READ,
    PERMISSIONS.MESSAGES_SEND,
    PERMISSIONS.CONTACTS_VIEW,
    PERMISSIONS.CONTACTS_MANAGE,
    PERMISSIONS.TEMPLATES_VIEW,
    PERMISSIONS.SETTINGS_VIEW,
  ],
  [WORKSPACE_ROLES.AGENT]: [
    PERMISSIONS.WORKSPACE_VIEW,
    PERMISSIONS.MEMBERS_VIEW,
    PERMISSIONS.WHATSAPP_VIEW,
    PERMISSIONS.CONVERSATIONS_VIEW,
    PERMISSIONS.MESSAGES_READ,
    PERMISSIONS.MESSAGES_SEND,
    PERMISSIONS.CONTACTS_VIEW,
    PERMISSIONS.TEMPLATES_VIEW,
    PERMISSIONS.SETTINGS_VIEW,
  ],
};

/**
 * Checks if a specific workspace role is granted a given permission.
 */
export function hasPermission(
  role: WorkspaceRole | string | undefined | null,
  permission: PermissionCode,
): boolean {
  if (!role) return false;
  const roleKey = role as WorkspaceRole;
  const granted = ROLE_PERMISSIONS[roleKey];
  if (!granted) return false;
  return granted.includes(permission);
}

/**
 * Returns all permission codes granted to the role.
 */
export function getPermissionsForRole(
  role: WorkspaceRole | string | undefined | null,
): PermissionCode[] {
  if (!role) return [];
  const roleKey = role as WorkspaceRole;
  return [...(ROLE_PERMISSIONS[roleKey] || [])];
}
