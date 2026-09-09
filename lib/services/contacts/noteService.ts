import { sql } from '@/lib/db';
import { ensureCoreTables } from '@/lib/auth/context';

export interface ContactNoteRecord {
  id: string;
  workspaceId: string;
  projectId: string;
  contactId: string;
  authorUserId: string;
  authorName?: string;
  authorEmail?: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export class NoteService {
  async getContactNotes(workspaceId: string, projectId: string, contactId: string): Promise<ContactNoteRecord[]> {
    await ensureCoreTables();

    // Verify contact belongs to project
    const { rows: contactRows } = await sql`
      SELECT id FROM contacts 
      WHERE id = ${contactId} AND workspace_id = ${workspaceId} AND project_id = ${projectId}
      LIMIT 1
    `;
    if (contactRows.length === 0) {
      throw new Error('Contact not found or does not belong to this project.');
    }

    const { rows } = await sql`
      SELECT 
        cn.id, cn.workspace_id, cn.project_id, cn.contact_id, cn.author_user_id,
        cn.content, cn.created_at, cn.updated_at,
        u.name as author_name, u.email as author_email
      FROM contact_notes cn
      LEFT JOIN users u ON cn.author_user_id = u.id
      WHERE cn.workspace_id = ${workspaceId} AND cn.project_id = ${projectId} AND cn.contact_id = ${contactId}
      ORDER BY cn.created_at DESC
    `;

    return rows.map((r: any) => ({
      id: r.id,
      workspaceId: r.workspace_id,
      projectId: r.project_id,
      contactId: r.contact_id,
      authorUserId: r.author_user_id,
      authorName: r.author_name || 'Team Member',
      authorEmail: r.author_email || '',
      content: r.content,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  async addContactNote(params: {
    workspaceId: string;
    projectId: string;
    contactId: string;
    authorUserId: string;
    authorName?: string;
    content: string;
  }): Promise<ContactNoteRecord> {
    await ensureCoreTables();
    const { workspaceId, projectId, contactId, authorUserId, authorName, content } = params;

    const cleanContent = content.trim();
    if (!cleanContent) {
      throw new Error('Note content cannot be empty.');
    }

    // Verify contact belongs to project
    const { rows: contactRows } = await sql`
      SELECT id FROM contacts 
      WHERE id = ${contactId} AND workspace_id = ${workspaceId} AND project_id = ${projectId}
      LIMIT 1
    `;
    if (contactRows.length === 0) {
      throw new Error('Contact not found or does not belong to this project.');
    }

    // Insert note (Strictly internal to Wazzi app - NEVER sent to WhatsApp)
    const { rows } = await sql`
      INSERT INTO contact_notes (
        workspace_id, project_id, contact_id, author_user_id, content
      )
      VALUES (
        ${workspaceId}, ${projectId}, ${contactId}, ${authorUserId}, ${cleanContent}
      )
      RETURNING id, workspace_id, project_id, contact_id, author_user_id, content, created_at, updated_at
    `;
    const r = rows[0];

    // Record activity
    await sql`
      INSERT INTO contact_activities (
        workspace_id, project_id, contact_id, type, actor_id, actor_name, description, metadata
      )
      VALUES (
        ${workspaceId}, ${projectId}, ${contactId}, 'NOTE_ADDED',
        ${authorUserId}, ${authorName || 'Team Member'},
        ${`Added internal note: "${cleanContent.slice(0, 60)}${cleanContent.length > 60 ? '...' : ''}"`},
        ${JSON.stringify({ noteId: r.id })}
      )
    `;

    return {
      id: r.id,
      workspaceId: r.workspace_id,
      projectId: r.project_id,
      contactId: r.contact_id,
      authorUserId: r.author_user_id,
      authorName: authorName || 'Team Member',
      content: r.content,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }
}

export const noteService = new NoteService();
