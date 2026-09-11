import { sql } from '@/lib/db';
import type { NextRequest } from 'next/server';

export interface AdminAuditEntry {
  adminUserId?: string;
  adminEmail?: string;
  action: string;
  entityType: string;
  entityId?: string;
  workspaceId?: string;
  tenantId?: string;
  oldValues?: any;
  newValues?: any;
  diff?: any;
  reason?: string;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
}

function getClientIp(request?: NextRequest): string | undefined {
  if (!request) return undefined;
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || (request as any).ip
    || undefined;
}

export async function logAdminAudit(entry: AdminAuditEntry, request?: NextRequest): Promise<void> {
  try {
    const ip = entry.ipAddress || (request ? getClientIp(request) : undefined);
    const ua = entry.userAgent || request?.headers.get('user-agent') || undefined;
    await sql`
      INSERT INTO admin_audit_logs (
        admin_user_id, admin_email, action, entity_type, entity_id,
        workspace_id, tenant_id, old_values, new_values, diff, reason,
        ip_address, user_agent, metadata
      ) VALUES (
        ${entry.adminUserId || null}, ${entry.adminEmail || null}, ${entry.action}, ${entry.entityType}, ${entry.entityId || null},
        ${entry.workspaceId || null}, ${entry.tenantId || null},
        ${entry.oldValues ? JSON.stringify(entry.oldValues) : null}::jsonb,
        ${entry.newValues ? JSON.stringify(entry.newValues) : null}::jsonb,
        ${entry.diff ? JSON.stringify(entry.diff) : null}::jsonb,
        ${entry.reason || null},
        ${ip || null}, ${ua || null},
        ${JSON.stringify(entry.metadata || {})}::jsonb
      )
    `;
  } catch (e) {
    // Audit logging must never break main flow
    console.warn('[adminAudit] failed to log', entry.action, e);
  }
}

// Convenience helpers for sensitive actions
export const AUDIT_ACTIONS = {
  TENANT_VIEW: 'TENANT_VIEW',
  TENANT_CREATE: 'TENANT_CREATE',
  TENANT_UPDATE: 'TENANT_UPDATE',
  TENANT_SUSPEND: 'TENANT_SUSPEND',
  TENANT_ACTIVATE: 'TENANT_ACTIVATE',
  TENANT_DELETE: 'TENANT_DELETE',
  TENANT_ASSIGN_PLAN: 'TENANT_ASSIGN_PLAN',
  TENANT_OVERRIDE_LIMITS: 'TENANT_OVERRIDE_LIMITS',
  TENANT_SWITCH: 'TENANT_SWITCH',
  USER_VIEW: 'USER_VIEW',
  USER_CREATE: 'USER_CREATE',
  USER_UPDATE: 'USER_UPDATE',
  USER_ASSIGN_ROLE: 'USER_ASSIGN_ROLE',
  USER_SUSPEND: 'USER_SUSPEND',
  USER_ACTIVATE: 'USER_ACTIVATE',
  USER_DELETE: 'USER_DELETE',
  USER_RESET_PASSWORD: 'USER_RESET_PASSWORD',
  PLAN_CREATE: 'PLAN_CREATE',
  PLAN_UPDATE: 'PLAN_UPDATE',
  PLAN_DELETE: 'PLAN_DELETE',
  SUBSCRIPTION_ASSIGN: 'SUBSCRIPTION_ASSIGN',
  SUBSCRIPTION_CHANGE: 'SUBSCRIPTION_CHANGE',
  SUBSCRIPTION_CANCEL: 'SUBSCRIPTION_CANCEL',
  SUBSCRIPTION_EXTEND_TRIAL: 'SUBSCRIPTION_EXTEND_TRIAL',
  PAYMENT_REFUND: 'PAYMENT_REFUND',
  META_CONFIG_UPDATE: 'META_CONFIG_UPDATE',
  META_CREDENTIALS_ROTATE: 'META_CREDENTIALS_ROTATE',
  WHATSAPP_VIEW: 'WHATSAPP_VIEW',
  PERMISSION_CHANGE: 'PERMISSION_CHANGE',
  ROLE_CHANGE: 'ROLE_CHANGE',
  LIMIT_OVERRIDE: 'LIMIT_OVERRIDE',
  LOGIN: 'ADMIN_LOGIN',
  LOGOUT: 'ADMIN_LOGOUT',
} as const;

export type AuditAction = typeof AUDIT_ACTIONS[keyof typeof AUDIT_ACTIONS];
