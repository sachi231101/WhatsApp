import { AutomationNodeRecord } from '../../../types';
import { ExecutionContext, NodeExecutionResult, ActionNodeExecutor } from '../../types';
import { ContactService } from '@/lib/services/contacts/contactService';
import { ProjectConnectionService } from '@/lib/services/whatsapp/projectConnectionService';
import { TemplateService } from '@/lib/services/whatsapp/templateService';
import { InboxService } from '@/lib/services/inbox/inboxService';

export class SendWhatsAppTemplateExecutor implements ActionNodeExecutor {
  private contactService: ContactService;
  private projectConnectionService: ProjectConnectionService;
  private templateService: TemplateService;
  private inboxService: InboxService;

  constructor(
    contactService?: ContactService,
    projectConnectionService?: ProjectConnectionService,
    templateService?: TemplateService,
    inboxService?: InboxService
  ) {
    this.contactService = contactService || new ContactService();
    this.projectConnectionService = projectConnectionService || new ProjectConnectionService();
    this.templateService = templateService || new TemplateService();
    this.inboxService = inboxService || new InboxService();
  }

  async execute(
    node: AutomationNodeRecord,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    const config = node.configuration || {};
    const { workspaceId, projectId, contactId } = context;

    // 1. Validate contact context
    if (!contactId) {
      return {
        status: 'FAILED',
        errorCode: 'INVALID_CONFIGURATION',
        errorMessage: 'Cannot send WhatsApp template: No contact associated with this workflow execution.',
      };
    }

    // 2. Resolve Contact and Authorized Phone Number
    let contact: any;
    try {
      contact = await this.contactService.getContactById(workspaceId, projectId, contactId);
    } catch (err: any) {
      return {
        status: 'FAILED',
        errorCode: 'RECIPIENT_NOT_FOUND',
        errorMessage: err?.message || `Contact "${contactId}" not found or access denied.`,
      };
    }

    const recipientPhone =
      contact.phoneNumber ||
      contact.phone_number ||
      contact.waId ||
      contact.wa_id ||
      contact.phoneNumbers?.[0]?.normalizedPhoneNumber ||
      contact.phoneNumbers?.[0]?.normalized_phone_number ||
      contact.phoneNumbers?.[0]?.phoneNumber ||
      contact.phoneNumbers?.[0]?.phone_number;

    if (!recipientPhone || !recipientPhone.trim()) {
      return {
        status: 'FAILED',
        errorCode: 'RECIPIENT_PHONE_NOT_FOUND',
        errorMessage: `Contact "${contact.displayName || contactId}" does not have a verified WhatsApp phone number.`,
      };
    }

    // 3. Verify WhatsApp Connection
    try {
      const conn = await this.projectConnectionService.getProjectConnection(projectId);
      if (!conn || conn.status !== 'CONNECTED' || !conn.phoneNumberId) {
        return {
          status: 'FAILED',
          errorCode: 'WHATSAPP_CONNECTION_UNAVAILABLE',
          errorMessage: 'No active or connected WhatsApp Business account found for this project.',
        };
      }

      if (config.whatsappPhoneNumberId && config.whatsappPhoneNumberId !== conn.phoneNumberId) {
        return {
          status: 'FAILED',
          errorCode: 'UNAUTHORIZED_RESOURCE',
          errorMessage: 'Specified WhatsApp phone number does not belong to this project.',
        };
      }
    } catch (connErr: any) {
      return {
        status: 'FAILED',
        errorCode: 'WHATSAPP_CONNECTION_UNAVAILABLE',
        errorMessage: connErr?.message || 'Error verifying WhatsApp connection status.',
      };
    }

    // 4. Validate Template Configuration, Status & Parameters
    const templateName = (config.templateName || config.template || '').trim();
    const templateId = (config.templateId || '').trim();
    const languageCode = (config.languageCode || config.language || 'en_US').trim();
    const parameters = config.parameters || [];

    if (!templateName && !templateId) {
      return {
        status: 'FAILED',
        errorCode: 'INVALID_CONFIGURATION',
        errorMessage: 'Template name or template ID is required for Send WhatsApp Template action.',
      };
    }

    const valResult = await this.templateService.validateAndResolveTemplate(
      workspaceId,
      {
        templateId: templateId || undefined,
        templateName: templateName || undefined,
        languageCode,
        parameters,
      },
      context
    );

    if (!valResult.valid || !valResult.template) {
      return {
        status: 'FAILED',
        errorCode: valResult.errorCode || 'TEMPLATE_NOT_FOUND',
        errorMessage: valResult.errorMessage || 'Template validation failed.',
      };
    }

    const template = valResult.template;
    const resolvedParams = valResult.resolvedParameters;

    // 5. Resolve Conversation (Templates bypass 24h window)
    let targetConversationId = context.conversationId;
    if (targetConversationId) {
      const conv = await this.inboxService.getConversationDetails(
        workspaceId,
        projectId,
        targetConversationId
      );
      if (!conv) {
        return {
          status: 'FAILED',
          errorCode: 'RESOURCE_NOT_FOUND',
          errorMessage: `Conversation "${targetConversationId}" not found or access denied.`,
        };
      }
    } else {
      const conv = await this.inboxService.findOrCreateConversation(
        workspaceId,
        projectId,
        contactId
      );
      targetConversationId = conv.id;
      context.conversationId = conv.id;
    }

    // 6. Support DRY_RUN execution mode
    if (context.metadata?.dryRun === true) {
      return {
        status: 'COMPLETED',
        output: {
          status: 'DRY_RUN',
          action: 'SEND_WHATSAPP_TEMPLATE',
          wouldSend: true,
          templateId: template.id,
          templateName: template.name,
          recipient: recipientPhone,
          parameters: resolvedParams,
          conversationId: targetConversationId,
          source: 'AUTOMATION',
        },
      };
    }

    // 7. Enqueue Outbound Template Message with Idempotency Key
    const idempotencyKey = `${workspaceId}:${projectId}:${context.executionId}:${node.id}`;

    try {
      const sendResult = await this.inboxService.sendOutboundMessage({
        workspaceId,
        projectId,
        conversationId: targetConversationId,
        content: template.bodyText || template.name,
        type: 'template',
        senderType: 'automation',
        templateName: template.name,
        templateParams: resolvedParams,
        idempotencyKey,
        metadata: {
          source: 'AUTOMATION',
          automationId: context.automationId,
          executionId: context.executionId,
          nodeId: node.id,
          templateId: template.id,
          templateName: template.name,
          language: template.language,
        },
      });

      if (sendResult.error) {
        return {
          status: 'FAILED',
          errorCode: 'OUTBOUND_QUEUE_ERROR',
          errorMessage: sendResult.error,
        };
      }

      return {
        status: 'COMPLETED',
        output: {
          status: 'QUEUED',
          action: 'SEND_WHATSAPP_TEMPLATE',
          messageId: sendResult.message.id,
          templateId: template.id,
          templateName: template.name,
          recipient: recipientPhone,
          source: 'AUTOMATION',
          deduplicated: Boolean(sendResult.deduplicated),
        },
        sideEffectId: `msg_${sendResult.message.id}`,
      };
    } catch (dispatchErr: any) {
      return {
        status: 'FAILED',
        errorCode: 'OUTBOUND_QUEUE_ERROR',
        errorMessage: dispatchErr?.message || 'Failed to queue outbound WhatsApp template message.',
      };
    }
  }
}
