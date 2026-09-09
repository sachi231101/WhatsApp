import { sql } from '@/lib/db';
import { ensureCoreTables } from '@/lib/auth/context';

export type CustomFieldType = 'TEXT' | 'NUMBER' | 'BOOLEAN' | 'DATE' | 'SELECT' | 'MULTI_SELECT';

export interface CustomFieldDefinitionRecord {
  id: string;
  workspaceId: string;
  projectId: string;
  name: string;
  key: string;
  type: CustomFieldType;
  required: boolean;
  options: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CustomFieldValueRecord {
  definitionId: string;
  name: string;
  key: string;
  type: CustomFieldType;
  required: boolean;
  options: string[];
  value: any;
}

export class CustomFieldService {
  async getFieldDefinitions(workspaceId: string, projectId: string): Promise<CustomFieldDefinitionRecord[]> {
    await ensureCoreTables();
    const { rows } = await sql`
      SELECT id, workspace_id, project_id, name, key, type, required, options, created_at, updated_at
      FROM custom_field_definitions
      WHERE workspace_id = ${workspaceId} AND project_id = ${projectId}
      ORDER BY name ASC
    `;
    return rows.map((r: any) => ({
      id: r.id,
      workspaceId: r.workspace_id,
      projectId: r.project_id,
      name: r.name,
      key: r.key,
      type: r.type as CustomFieldType,
      required: Boolean(r.required),
      options: Array.isArray(r.options) ? r.options : typeof r.options === 'string' ? JSON.parse(r.options) : [],
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  async createFieldDefinition(params: {
    workspaceId: string;
    projectId: string;
    name: string;
    key?: string;
    type: CustomFieldType;
    required?: boolean;
    options?: string[];
  }): Promise<CustomFieldDefinitionRecord> {
    await ensureCoreTables();
    const { workspaceId, projectId, name, type, required = false, options = [] } = params;

    const cleanName = name.trim();
    if (!cleanName) {
      throw new Error('Field name is required.');
    }

    const validTypes: CustomFieldType[] = ['TEXT', 'NUMBER', 'BOOLEAN', 'DATE', 'SELECT', 'MULTI_SELECT'];
    if (!validTypes.includes(type)) {
      throw new Error(`Invalid custom field type: ${type}`);
    }

    const key = (params.key?.trim() || cleanName.toLowerCase().replace(/[^a-z0-9_]+/g, '_')).slice(0, 100);

    const { rows } = await sql`
      INSERT INTO custom_field_definitions (
        workspace_id, project_id, name, key, type, required, options
      )
      VALUES (
        ${workspaceId}, ${projectId}, ${cleanName}, ${key}, ${type}, ${required},
        ${JSON.stringify(options)}
      )
      ON CONFLICT (project_id, key) DO UPDATE SET
        name = EXCLUDED.name,
        type = EXCLUDED.type,
        required = EXCLUDED.required,
        options = EXCLUDED.options,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id, workspace_id, project_id, name, key, type, required, options, created_at, updated_at
    `;

    const r = rows[0];
    return {
      id: r.id,
      workspaceId: r.workspace_id,
      projectId: r.project_id,
      name: r.name,
      key: r.key,
      type: r.type as CustomFieldType,
      required: Boolean(r.required),
      options: Array.isArray(r.options) ? r.options : [],
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  async getFieldValuesForContact(
    workspaceId: string,
    projectId: string,
    contactId: string,
  ): Promise<CustomFieldValueRecord[]> {
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

    // Join definitions with values
    const { rows } = await sql`
      SELECT 
        d.id as definition_id, d.name, d.key, d.type, d.required, d.options,
        v.value
      FROM custom_field_definitions d
      LEFT JOIN custom_field_values v ON d.id = v.definition_id AND v.contact_id = ${contactId}
      WHERE d.workspace_id = ${workspaceId} AND d.project_id = ${projectId}
      ORDER BY d.name ASC
    `;

    return rows.map((r: any) => ({
      definitionId: r.definition_id,
      name: r.name,
      key: r.key,
      type: r.type as CustomFieldType,
      required: Boolean(r.required),
      options: Array.isArray(r.options) ? r.options : typeof r.options === 'string' ? JSON.parse(r.options) : [],
      value: r.value !== undefined ? (typeof r.value === 'string' ? (r.value.startsWith('"') ? JSON.parse(r.value) : r.value) : r.value) : null,
    }));
  }

  async setFieldValueForContact(
    workspaceId: string,
    projectId: string,
    contactId: string,
    definitionId: string,
    value: any,
  ): Promise<void> {
    await ensureCoreTables();

    // Ensure definition belongs to project
    const { rows: defRows } = await sql`
      SELECT id, type, required FROM custom_field_definitions
      WHERE id = ${definitionId} AND workspace_id = ${workspaceId} AND project_id = ${projectId}
      LIMIT 1
    `;
    if (defRows.length === 0) {
      throw new Error('Custom field definition does not belong to this project.');
    }

    // Ensure contact belongs to project
    const { rows: contactRows } = await sql`
      SELECT id FROM contacts
      WHERE id = ${contactId} AND workspace_id = ${workspaceId} AND project_id = ${projectId}
      LIMIT 1
    `;
    if (contactRows.length === 0) {
      throw new Error('Contact does not belong to this project.');
    }

    await sql`
      INSERT INTO custom_field_values (definition_id, contact_id, value)
      VALUES (${definitionId}, ${contactId}, ${JSON.stringify(value)})
      ON CONFLICT (definition_id, contact_id) DO UPDATE SET
        value = EXCLUDED.value,
        updated_at = CURRENT_TIMESTAMP
    `;
  }
}

export const customFieldService = new CustomFieldService();
