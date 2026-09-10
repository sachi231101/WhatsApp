import { sql } from '@/lib/db';
import { ensureCoreTables } from '@/lib/auth/context';
import { isMockMode, MOCK_MESSAGE_TEMPLATES } from '@/app/api/mockData';
import { VariableResolver } from '../automation/execution/variableResolver';
import { ExecutionContext } from '../automation/execution/types';

export interface WhatsAppTemplateRecord {
  id: string;
  workspaceId: string;
  name: string;
  language: string;
  status: string;
  category: string;
  bodyText?: string | null;
  components?: any[];
  metaTemplateId?: string | null;
}

export interface ValidateTemplateResult {
  valid: boolean;
  errorCode?: string;
  errorMessage?: string;
  template?: WhatsAppTemplateRecord;
  resolvedParameters?: Record<string, any> | any[];
}

export class TemplateService {
  /**
   * Retrieves a template by ID or Name strictly scoped to workspace.
   */
  async getTemplate(
    workspaceId: string,
    identifier: { templateId?: string; templateName?: string }
  ): Promise<WhatsAppTemplateRecord | null> {
    await ensureCoreTables();

    const templateId = identifier.templateId?.trim() || null;
    const templateName = identifier.templateName?.trim() || null;

    if (!templateId && !templateName) {
      return null;
    }

    // 1. Query database templates table
    if (templateId) {
      try {
        const { rows } = await sql`
          SELECT id, workspace_id, name, language, status, category, body_text, meta_template_id
          FROM templates
          WHERE workspace_id = ${workspaceId}
            AND (id = ${templateId} OR meta_template_id = ${templateId})
          LIMIT 1
        `;
        if (rows.length > 0) return this.mapTemplateRow(rows[0]);
      } catch {}

      try {
        const { rows: wtRows } = await sql`
          SELECT id, workspace_id, name, language, status, category, body_text, meta_template_id
          FROM whatsapp_templates
          WHERE workspace_id = ${workspaceId}
            AND (id = ${templateId} OR meta_template_id = ${templateId})
          LIMIT 1
        `;
        if (wtRows.length > 0) return this.mapTemplateRow(wtRows[0]);
      } catch {}
    }

    if (templateName) {
      try {
        const { rows } = await sql`
          SELECT id, workspace_id, name, language, status, category, body_text, meta_template_id
          FROM templates
          WHERE workspace_id = ${workspaceId}
            AND name = ${templateName}
          LIMIT 1
        `;
        if (rows.length > 0) return this.mapTemplateRow(rows[0]);
      } catch {}

      try {
        const { rows: wtRows } = await sql`
          SELECT id, workspace_id, name, language, status, category, body_text, meta_template_id
          FROM whatsapp_templates
          WHERE workspace_id = ${workspaceId}
            AND name = ${templateName}
          LIMIT 1
        `;
        if (wtRows.length > 0) return this.mapTemplateRow(wtRows[0]);
      } catch {}
    }

    // 3. Fallback to mock catalog in Mock/Test mode
    if (isMockMode() || process.env.NODE_ENV === 'test') {
      const mock = MOCK_MESSAGE_TEMPLATES.find(
        (t) =>
          (templateId && (t.id === templateId || t.name === templateId)) ||
          (templateName && t.name.toLowerCase() === templateName.toLowerCase())
      );

      if (mock) {
        return {
          id: mock.id,
          workspaceId,
          name: mock.name,
          language: mock.language,
          status: mock.status.toUpperCase(),
          category: mock.category,
          components: mock.components,
          bodyText: mock.components.find((c) => c.type === 'BODY')?.text,
        };
      }
    }

    return null;
  }

  private mapTemplateRow(r: any): WhatsAppTemplateRecord {
    return {
      id: r.id,
      workspaceId: r.workspace_id,
      name: r.name,
      language: r.language,
      status: (r.status || 'PENDING').toUpperCase(),
      category: r.category,
      bodyText: r.body_text,
      metaTemplateId: r.meta_template_id,
    };
  }

  /**
   * Validates template existence, tenant ownership, approval status, language match,
   * and resolves parameters using VariableResolver.
   */
  async validateAndResolveTemplate(
    workspaceId: string,
    options: {
      templateId?: string;
      templateName?: string;
      languageCode?: string;
      parameters?: Record<string, any> | any[];
    },
    context: ExecutionContext
  ): Promise<ValidateTemplateResult> {
    const template = await this.getTemplate(workspaceId, {
      templateId: options.templateId,
      templateName: options.templateName,
    });

    if (!template) {
      return {
        valid: false,
        errorCode: 'TEMPLATE_NOT_FOUND',
        errorMessage: `WhatsApp template "${options.templateName || options.templateId}" was not found for this workspace.`,
      };
    }

    if (template.workspaceId !== workspaceId) {
      return {
        valid: false,
        errorCode: 'UNAUTHORIZED_RESOURCE',
        errorMessage: 'WhatsApp template does not belong to the active workspace.',
      };
    }

    if (template.status !== 'APPROVED') {
      return {
        valid: false,
        errorCode: 'TEMPLATE_NOT_APPROVED',
        errorMessage: `WhatsApp template "${template.name}" is not approved by Meta (current status: ${template.status}).`,
      };
    }

    // Language validation
    const requestedLang = (options.languageCode || 'en_US').trim();
    const templateLang = (template.language || 'en_US').trim();
    if (requestedLang.toLowerCase() !== templateLang.toLowerCase()) {
      return {
        valid: false,
        errorCode: 'INVALID_TEMPLATE_LANGUAGE',
        errorMessage: `Requested language "${requestedLang}" is not supported by template "${template.name}" (supported: ${templateLang}).`,
      };
    }

    // Resolve parameters
    let resolvedParameters: any = options.parameters || [];
    if (options.parameters) {
      if (Array.isArray(options.parameters)) {
        resolvedParameters = options.parameters.map((param) => {
          if (typeof param === 'string') {
            return VariableResolver.resolveString(param, context);
          }
          if (typeof param === 'object' && param !== null) {
            return VariableResolver.resolveObject(param, context);
          }
          return param;
        });
      } else if (typeof options.parameters === 'object') {
        resolvedParameters = VariableResolver.resolveObject(options.parameters, context);
      }
    }

    return {
      valid: true,
      template,
      resolvedParameters,
    };
  }
}

export const templateService = new TemplateService();
