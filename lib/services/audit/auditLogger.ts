import { sql } from '@/lib/db';

export interface AuditLogEntry {
  workspaceId: string;
  projectId?: string;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string;
  oldValues?: Record<string, any> | null;
  newValues?: Record<string, any> | null;
  ipAddress?: string;
  userAgent?: string;
}

export async function recordAuditLog(entry: AuditLogEntry): Promise<void> {
  const {
    workspaceId,
    projectId,
    userId,
    action,
    entityType,
    entityId,
    oldValues,
    newValues,
    ipAddress,
    userAgent,
  } = entry;

  try {
    await sql`
      INSERT INTO audit_logs (
        workspace_id, project_id, user_id, action, entity_type, entity_id,
        old_values, new_values, ip_address, user_agent, created_at
      )
      VALUES (
        ${workspaceId}, ${projectId || null}, ${userId || null},
        ${action}, ${entityType}, ${entityId || null},
        ${oldValues ? JSON.stringify(oldValues) : null},
        ${newValues ? JSON.stringify(newValues) : null},
        ${ipAddress || null}, ${userAgent || null},
        CURRENT_TIMESTAMP
      )
    `;
  } catch (err) {
    console.error('[AuditLogger] Failed to record audit log:', err);
  }
}
