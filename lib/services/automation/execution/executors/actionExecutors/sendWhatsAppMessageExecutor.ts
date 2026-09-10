import { AutomationNodeRecord } from '../../../types';
import { ExecutionContext, NodeExecutionResult, ActionNodeExecutor } from '../../types';
import { ContactService } from '@/lib/services/contacts/contactService';
import { ProjectConnectionService } from '@/lib/services/whatsapp/projectConnectionService';
import { InboxService } from '@/lib/services/inbox/inboxService';
import { VariableResolver } from '../../variableResolver';

export class SendWhatsAppMessageExecutor implements ActionNodeExecutor {
  private contactService: ContactService;
  private projectConnectionService: ProjectConnectionService;
  private inboxService: InboxService;

  constructor(
    contactService?: ContactService,
    projectConnectionService?: ProjectConnectionService,
    inboxService?: InboxService
  ) {
    this.contactService = contactService || new ContactService();
    this.projectConnectionService = projectConnectionService || new ProjectConnectionService();
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
        errorMessage: 'Cannot send WhatsApp message: No contact associated with this workflow execution.',
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

      // If configuration specifies a specific phone number ID, verify ownership
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

    // 4. Resolve Message Text & Dynamic Variables
    const rawText = (config.messageText || config.message || config.text || '').trim();
    if (!rawText) {
      return {
        status: 'FAILED',
        errorCode: 'INVALID_CONFIGURATION',
        errorMessage: 'Message text is required for Send WhatsApp Message action.',
      };
    }

    const resolvedText = VariableResolver.resolveString(rawText, context);

    // 5. Resolve Conversation & 24-Hour Messaging Policy Window
    let targetConversationId = context.conversationId;
    let windowExpiresAt: string | null = null;

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
      windowExpiresAt = conv.window_expires_at;
    } else {
      // Find or create conversation for contact
      const conv = await this.inboxService.findOrCreateConversation(
        workspaceId,
        projectId,
        contactId
      );
      targetConversationId = conv.id;
      windowExpiresAt = conv.windowExpiresAt;
      context.conversationId = conv.id;
    }

    // Check 24h Policy Window for free-form text
    if (!windowExpiresAt) {
      return {
        status: 'FAILED',
        errorCode: 'MESSAGE_WINDOW_RESTRICTED',
        errorMessage:
          'Free-form messages unavailable. Customer service window expired or customer has not initiated contact within 24 hours. Use a WhatsApp template to continue.',
      };
    }

    const windowExpiryTime = new Date(windowExpiresAt).getTime();
    if (Date.now() > windowExpiryTime) {
      return {
        status: 'FAILED',
        errorCode: 'MESSAGE_WINDOW_RESTRICTED',
        errorMessage:
          'Free-form messages unavailable. Customer service window expired. Use a WhatsApp template to continue.',
      };
    }

    // 6. Support DRY_RUN execution mode
    if (context.metadata?.dryRun === true) {
      return {
        status: 'COMPLETED',
        output: {
          status: 'DRY_RUN',
          action: 'SEND_WHATSAPP_MESSAGE',
          wouldSend: true,
          recipient: recipientPhone,
          messageText: resolvedText,
          conversationId: targetConversationId,
          source: 'AUTOMATION',
        },
      };
    }

    // 7. Enqueue Outbound Message with Idempotency Key
    const idempotencyKey = `${workspaceId}:${projectId}:${context.executionId}:${node.id}`;

    try {
      const sendResult = await this.inboxService.sendOutboundMessage({
        workspaceId,
        projectId,
        conversationId: targetConversationId,
        content: resolvedText,
        type: 'text',
        senderType: 'automation',
        idempotencyKey,
        metadata: {
          source: 'AUTOMATION',
          automationId: context.automationId,
          executionId: context.executionId,
          nodeId: node.id,
        },
      });

      if (sendResult.error) {
        if (sendResult.windowExpired) {
          return {
            status: 'FAILED',
            errorCode: 'MESSAGE_WINDOW_RESTRICTED',
            errorMessage: sendResult.error,
          };
        }
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
          action: 'SEND_WHATSAPP_MESSAGE',
          messageId: sendResult.message.id,
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
        errorMessage: dispatchErr?.message || 'Failed to queue outbound WhatsApp message.',
      };
    }
  }
}
