import { sql } from '@/lib/db';
import { ensureCoreTables } from '@/lib/auth/context';
import { publishContactEvent } from '@/lib/realtime/ablyPublisher';

export interface TagRecord {
  id: string;
  workspaceId: string;
  projectId: string;
  name: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export class TagService {
  async getProjectTags(workspaceId: string, projectId: string): Promise<TagRecord[]> {
    await ensureCoreTables();
    const { rows } = await sql`
      SELECT id, workspace_id, project_id, name, color, created_at, updated_at
      FROM tags
      WHERE workspace_id = ${workspaceId} AND project_id = ${projectId}
      ORDER BY name ASC
    `;
    return rows.map((r: any) => ({
      id: r.id,
      workspaceId: r.workspace_id,
      projectId: r.project_id,
      name: r.name,
      color: r.color,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  async createTag(workspaceId: string, projectId: string, name: string, color = '#1b59f8'): Promise<TagRecord> {
    await ensureCoreTables();
    const cleanName = name.trim();
    if (!cleanName) {
      throw new Error('Tag name is required.');
    }

    const { rows } = await sql`
      INSERT INTO tags (workspace_id, project_id, name, color)
      VALUES (${workspaceId}, ${projectId}, ${cleanName}, ${color})
      ON CONFLICT (project_id, name) DO UPDATE SET
        color = EXCLUDED.color,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id, workspace_id, project_id, name, color, created_at, updated_at
    `;

    const r = rows[0];
    return {
      id: r.id,
      workspaceId: r.workspace_id,
      projectId: r.project_id,
      name: r.name,
      color: r.color,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  async getContactTags(workspaceId: string, projectId: string, contactId: string): Promise<TagRecord[]> {
    await ensureCoreTables();
    const { rows } = await sql`
      SELECT t.id, t.workspace_id, t.project_id, t.name, t.color, t.created_at, t.updated_at
      FROM tags t
      JOIN contact_tags ct ON t.id = ct.tag_id
      WHERE ct.workspace_id = ${workspaceId} 
        AND ct.project_id = ${projectId} 
        AND ct.contact_id = ${contactId}
      ORDER BY t.name ASC
    `;
    return rows.map((r: any) => ({
      id: r.id,
      workspaceId: r.workspace_id,
      projectId: r.project_id,
      name: r.name,
      color: r.color,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  async addTagToContact(
    workspaceId: string,
    projectId: string,
    contactId: string,
    tagId: string,
    actorId?: string,
    actorName?: string,
  ): Promise<boolean> {
    await ensureCoreTables();

    // Verify contact exists within this workspace & project
    const { rows: contactRows } = await sql`
      SELECT id FROM contacts 
      WHERE id = ${contactId} AND workspace_id = ${workspaceId} AND project_id = ${projectId}
      LIMIT 1
    `;
    if (contactRows.length === 0) {
      throw new Error('Contact not found or does not belong to this project.');
    }

    // Verify tag exists within this workspace & project
    const { rows: tagRows } = await sql`
      SELECT id, name FROM tags 
      WHERE id = ${tagId} AND workspace_id = ${workspaceId} AND project_id = ${projectId}
      LIMIT 1
    `;
    if (tagRows.length === 0) {
      throw new Error('Tag not found or does not belong to this project.');
    }
    const tag = tagRows[0];

    // Associate
    await sql`
      INSERT INTO contact_tags (workspace_id, project_id, contact_id, tag_id)
      VALUES (${workspaceId}, ${projectId}, ${contactId}, ${tagId})
      ON CONFLICT (contact_id, tag_id) DO NOTHING
    `;

    // Record activity
    await sql`
      INSERT INTO contact_activities (
        workspace_id, project_id, contact_id, type, actor_id, actor_name, description, metadata
      )
      VALUES (
        ${workspaceId}, ${projectId}, ${contactId}, 'TAG_ADDED',
        ${actorId || null}, ${actorName || 'User'},
        ${`Added tag: ${tag.name}`},
        ${JSON.stringify({ tagId: tag.id, tagName: tag.name })}
      )
    `;

    await publishContactEvent({
      workspaceId,
      projectId,
      event: 'contact.tag.updated',
      data: { contactId, action: 'added', tagId: tag.id, tagName: tag.name },
    });

    return true;
  }

  async removeTagFromContact(
    workspaceId: string,
    projectId: string,
    contactId: string,
    tagId: string,
    actorId?: string,
    actorName?: string,
  ): Promise<boolean> {
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

    const { rows: tagRows } = await sql`
      SELECT id, name FROM tags WHERE id = ${tagId} LIMIT 1
    `;
    const tagName = tagRows[0]?.name || 'Unknown';

    await sql`
      DELETE FROM contact_tags
      WHERE workspace_id = ${workspaceId} AND project_id = ${projectId}
        AND contact_id = ${contactId} AND tag_id = ${tagId}
    `;

    // Record activity
    await sql`
      INSERT INTO contact_activities (
        workspace_id, project_id, contact_id, type, actor_id, actor_name, description, metadata
      )
      VALUES (
        ${workspaceId}, ${projectId}, ${contactId}, 'TAG_REMOVED',
        ${actorId || null}, ${actorName || 'User'},
        ${`Removed tag: ${tagName}`},
        ${JSON.stringify({ tagId, tagName })}
      )
    `;

    await publishContactEvent({
      workspaceId,
      projectId,
      event: 'contact.tag.updated',
      data: { contactId, action: 'removed', tagId, tagName },
    });

    return true;
  }
}

export const tagService = new TagService();
