import { AutomationNodeRecord } from '../../../types';
import { ExecutionContext, NodeExecutionResult, ActionNodeExecutor } from '../../types';
import { ContactService } from '@/lib/services/contacts/contactService';
import { CustomFieldService } from '@/lib/services/contacts/customFieldService';
import { isValidEmail } from '@/lib/services/contacts/phoneUtils';
import { VariableResolver } from '@/lib/services/automation/execution/variableResolver';

const ALLOWED_STATUSES = new Set(['ACTIVE', 'INACTIVE', 'BLOCKED', 'ARCHIVED']);

export class UpdateContactExecutor implements ActionNodeExecutor {
  private contactService: ContactService;
  private customFieldService: CustomFieldService;

  constructor(contactService?: ContactService, customFieldService?: CustomFieldService) {
    this.contactService = contactService || new ContactService();
    this.customFieldService = customFieldService || new CustomFieldService();
  }

  async execute(
    node: AutomationNodeRecord,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    const config = node.configuration || {};
    const { workspaceId, projectId, contactId } = context;

    if (!contactId) {
      return {
        status: 'FAILED',
        errorCode: 'INVALID_CONFIGURATION',
        errorMessage: 'Cannot update contact: No contact associated with this workflow execution.',
      };
    }

    // Resolve raw fields from config: supports { fields: { ... } } or flat configuration
    const rawFields = (config.fields && typeof config.fields === 'object') ? config.fields : config;

    // Filter only allowed fields (Strict security whitelist: never arbitrary columns)
    const firstName = rawFields.firstName ?? rawFields.first_name;
    const lastName = rawFields.lastName ?? rawFields.last_name;
    const displayName = rawFields.displayName ?? rawFields.name;
    const email = rawFields.email;
    const company = rawFields.company;
    const status = rawFields.status;
    const leadScore = rawFields.leadScore ?? rawFields.lead_score;
    const customFields = rawFields.customFields || config.customFields || null;

    const hasAnyField =
      firstName !== undefined ||
      lastName !== undefined ||
      displayName !== undefined ||
      email !== undefined ||
      company !== undefined ||
      status !== undefined ||
      leadScore !== undefined ||
      (customFields && Object.keys(customFields).length > 0);

    if (!hasAnyField) {
      return {
        status: 'FAILED',
        errorCode: 'INVALID_CONFIGURATION',
        errorMessage: 'Cannot update contact: At least one allowed contact field must be specified.',
      };
    }

    // 1. Fetch current contact to verify tenant access & natural idempotency
    let currentContact: any;
    try {
      currentContact = await this.contactService.getContactById(workspaceId, projectId, contactId);
      if (!currentContact) {
        return {
          status: 'FAILED',
          errorCode: 'RESOURCE_NOT_FOUND',
          errorMessage: 'Contact not found or does not belong to this project.',
        };
      }
    } catch (err: any) {
      return {
        status: 'FAILED',
        errorCode: 'RESOURCE_NOT_FOUND',
        errorMessage: err?.message || 'Contact not found.',
      };
    }

    // 2. Validate & Interpolate Values
    const updateInput: Record<string, any> = {
      workspaceId,
      projectId,
      contactId,
      actorName: 'Automation Engine',
    };
    const changedFields: string[] = [];

    // First Name
    if (firstName !== undefined) {
      const resolved = VariableResolver.resolveString(String(firstName), context).trim();
      if (resolved !== (currentContact.firstName || '')) {
        updateInput.firstName = resolved;
        changedFields.push('firstName');
      }
    }

    // Last Name
    if (lastName !== undefined) {
      const resolved = VariableResolver.resolveString(String(lastName), context).trim();
      if (resolved !== (currentContact.lastName || '')) {
        updateInput.lastName = resolved;
        changedFields.push('lastName');
      }
    }

    // Display Name
    if (displayName !== undefined) {
      const resolved = VariableResolver.resolveString(String(displayName), context).trim();
      if (resolved !== (currentContact.displayName || '')) {
        updateInput.displayName = resolved;
        changedFields.push('displayName');
      }
    }

    // Email
    if (email !== undefined) {
      const resolved = VariableResolver.resolveString(String(email), context).trim();
      if (resolved) {
        if (!isValidEmail(resolved)) {
          return {
            status: 'FAILED',
            errorCode: 'INVALID_FIELD',
            errorMessage: `Invalid email address format: "${resolved}".`,
          };
        }
      }
      if (resolved !== (currentContact.email || '')) {
        updateInput.email = resolved || null;
        changedFields.push('email');
      }
    }

    // Company
    if (company !== undefined) {
      const resolved = VariableResolver.resolveString(String(company), context).trim();
      if (resolved !== (currentContact.company || '')) {
        updateInput.company = resolved;
        changedFields.push('company');
      }
    }

    // Status
    if (status !== undefined) {
      const normalizedStatus = String(status).toUpperCase().trim();
      if (!ALLOWED_STATUSES.has(normalizedStatus)) {
        return {
          status: 'FAILED',
          errorCode: 'INVALID_STATUS',
          errorMessage: `Invalid contact status "${status}". Allowed values: ACTIVE, INACTIVE, BLOCKED, ARCHIVED.`,
        };
      }
      if (normalizedStatus !== currentContact.status) {
        updateInput.status = normalizedStatus;
        changedFields.push('status');
      }
    }

    // Lead Score
    if (leadScore !== undefined) {
      const resolvedScore = typeof leadScore === 'string'
        ? Number(VariableResolver.resolveString(leadScore, context))
        : Number(leadScore);

      if (isNaN(resolvedScore) || resolvedScore < 0 || resolvedScore > 100) {
        return {
          status: 'FAILED',
          errorCode: 'INVALID_FIELD',
          errorMessage: `Lead score must be an integer between 0 and 100. Received: "${leadScore}".`,
        };
      }
      if (resolvedScore !== currentContact.leadScore) {
        updateInput.leadScore = resolvedScore;
        changedFields.push('leadScore');
      }
    }

    // 3. Custom Fields Processing
    if (customFields && typeof customFields === 'object') {
      try {
        const definitions = await this.customFieldService.getFieldDefinitions(workspaceId, projectId);
        for (const [keyOrId, rawVal] of Object.entries(customFields)) {
          const def = definitions.find((d) => d.id === keyOrId || d.key === keyOrId);
          if (!def) {
            return {
              status: 'FAILED',
              errorCode: 'RESOURCE_NOT_FOUND',
              errorMessage: `Custom field definition "${keyOrId}" does not belong to this project.`,
            };
          }

          let resolvedVal = rawVal;
          if (typeof rawVal === 'string') {
            resolvedVal = VariableResolver.resolveString(rawVal, context);
          }

          await this.customFieldService.setFieldValueForContact(
            workspaceId,
            projectId,
            contactId,
            def.id,
            resolvedVal
          );
          changedFields.push(`custom_${def.key}`);
        }
      } catch (err: any) {
        return {
          status: 'FAILED',
          errorCode: 'RESOURCE_NOT_FOUND',
          errorMessage: err?.message || 'Error updating custom fields.',
        };
      }
    }

    // 4. If standard fields changed, update contact record
    if (changedFields.some((f) => !f.startsWith('custom_'))) {
      try {
        await this.contactService.updateContact(updateInput as any);
      } catch (err: any) {
        return {
          status: 'FAILED',
          errorCode: 'ACTION_ERROR',
          errorMessage: err?.message || 'Failed to update contact.',
        };
      }
    }

    return {
      status: 'COMPLETED',
      output: {
        action: 'UPDATE_CONTACT',
        changedFields,
      },
      sideEffectId: `contact_upd_${contactId}`,
    };
  }
}
