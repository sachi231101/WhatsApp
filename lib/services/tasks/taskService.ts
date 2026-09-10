import { sql } from '@/lib/db';
import { ensureCoreTables } from '@/lib/auth/context';

export interface TaskRecord {
  id: string;
  workspaceId: string;
  projectId: string;
  contactId?: string | null;
  conversationId?: string | null;
  title: string;
  description?: string | null;
  assigneeUserId?: string | null;
  priority: string;
  status: string;
  dueDate?: string | null;
  source: string;
  idempotencyKey?: string | null;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskInput {
  workspaceId: string;
  projectId: string;
  contactId?: string | null;
  conversationId?: string | null;
  title: string;
  description?: string | null;
  assigneeUserId?: string | null;
  priority?: 'low' | 'medium' | 'high' | 'urgent' | string;
  status?: 'open' | 'in_progress' | 'completed' | 'cancelled' | string;
  dueDate?: string | Date | null;
  source?: string;
  idempotencyKey?: string | null;
  metadata?: Record<string, any>;
}

export class TaskService {
  /**
   * Creates a new task with strict tenant isolation, assignee verification, and idempotency protection.
   */
  async createTask(input: CreateTaskInput): Promise<{ task: TaskRecord; deduplicated: boolean }> {
    await ensureCoreTables();

    const {
      workspaceId,
      projectId,
      contactId = null,
      conversationId = null,
      title,
      description = null,
      assigneeUserId = null,
      priority = 'medium',
      status = 'open',
      dueDate = null,
      source = 'AUTOMATION',
      idempotencyKey = null,
      metadata = {},
    } = input;

    const cleanTitle = (title || '').trim();
    if (!cleanTitle) {
      throw new Error('Task title is required.');
    }

    // 1. Verify Tenant Boundaries
    const { rows: projRows } = await sql`
      SELECT id FROM projects 
      WHERE id = ${projectId} AND workspace_id = ${workspaceId}
      LIMIT 1
    `;
    if (projRows.length === 0) {
      throw new Error('Project not found or tenant access denied.');
    }

    // 2. Check Idempotency Key if provided
    if (idempotencyKey) {
      const { rows: existingRows } = await sql`
        SELECT * FROM tasks
        WHERE project_id = ${projectId} AND idempotency_key = ${idempotencyKey}
        LIMIT 1
      `;
      if (existingRows.length > 0) {
        const row = existingRows[0];
        return {
          task: this.mapRow(row),
          deduplicated: true,
        };
      }
    }

    // 3. Verify Assignee belongs to Workspace if specified
    if (assigneeUserId) {
      const { rows: memberRows } = await sql`
        SELECT wm.user_id 
        FROM workspace_members wm
        WHERE wm.workspace_id = ${workspaceId} 
          AND wm.user_id = ${assigneeUserId} 
          AND wm.status = 'active'
        LIMIT 1
      `;
      if (memberRows.length === 0) {
        throw new Error('Assignee user does not belong to this workspace or is inactive.');
      }
    }

    // 4. Verify Contact belongs to Project if specified
    if (contactId) {
      const { rows: contactRows } = await sql`
        SELECT id FROM contacts
        WHERE id = ${contactId} AND workspace_id = ${workspaceId} AND project_id = ${projectId}
        LIMIT 1
      `;
      if (contactRows.length === 0) {
        throw new Error('Contact not found or does not belong to this project.');
      }
    }

    // 5. Verify Conversation belongs to Project if specified
    if (conversationId) {
      const { rows: convRows } = await sql`
        SELECT id FROM conversations
        WHERE id = ${conversationId} AND workspace_id = ${workspaceId} AND project_id = ${projectId}
        LIMIT 1
      `;
      if (convRows.length === 0) {
        throw new Error('Conversation not found or does not belong to this project.');
      }
    }

    // 6. Format Due Date
    const parsedDueDate = dueDate ? new Date(dueDate).toISOString() : null;

    // 7. Insert Task
    const { rows: insertedRows } = await sql`
      INSERT INTO tasks (
        workspace_id, project_id, contact_id, conversation_id,
        title, description, assignee_user_id, priority, status,
        due_date, source, idempotency_key, metadata, created_at, updated_at
      )
      VALUES (
        ${workspaceId}, ${projectId}, ${contactId}, ${conversationId},
        ${cleanTitle}, ${description}, ${assigneeUserId}, ${priority.toLowerCase()}, ${status.toLowerCase()},
        ${parsedDueDate}, ${source}, ${idempotencyKey}, ${JSON.stringify(metadata)},
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      RETURNING *
    `;

    const task = this.mapRow(insertedRows[0]);
    return { task, deduplicated: false };
  }

  async getTaskById(workspaceId: string, projectId: string, taskId: string): Promise<TaskRecord | null> {
    await ensureCoreTables();
    const { rows } = await sql`
      SELECT * FROM tasks
      WHERE id = ${taskId} AND workspace_id = ${workspaceId} AND project_id = ${projectId}
      LIMIT 1
    `;
    if (rows.length === 0) return null;
    return this.mapRow(rows[0]);
  }

  private mapRow(r: any): TaskRecord {
    return {
      id: r.id,
      workspaceId: r.workspace_id,
      projectId: r.project_id,
      contactId: r.contact_id || null,
      conversationId: r.conversation_id || null,
      title: r.title,
      description: r.description || null,
      assigneeUserId: r.assignee_user_id || null,
      priority: r.priority,
      status: r.status,
      dueDate: r.due_date ? new Date(r.due_date).toISOString() : null,
      source: r.source,
      idempotencyKey: r.idempotency_key || null,
      metadata: typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata || {},
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }
}

export const taskService = new TaskService();
