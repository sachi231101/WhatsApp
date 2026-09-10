import { ActionNodeExecutor } from '../types';
import { AddTagExecutor } from './actionExecutors/addTagExecutor';
import { RemoveTagExecutor } from './actionExecutors/removeTagExecutor';
import { UpdateContactExecutor } from './actionExecutors/updateContactExecutor';
import { AssignAgentExecutor } from './actionExecutors/assignAgentExecutor';
import { ChangeConversationStatusExecutor } from './actionExecutors/changeConversationStatusExecutor';
import { SendInternalNoteExecutor } from './actionExecutors/sendInternalNoteExecutor';
import { CreateTaskExecutor } from './actionExecutors/createTaskExecutor';
import { SendWhatsAppMessageExecutor } from './actionExecutors/sendWhatsAppMessageExecutor';
import { SendWhatsAppTemplateExecutor } from './actionExecutors/sendWhatsAppTemplateExecutor';
import { SendMediaExecutor } from './actionExecutors/sendMediaExecutor';
import { AiAgentExecutor } from './actionExecutors/aiAgentExecutor';
import { AnalyzeSentimentExecutor } from './actionExecutors/analyzeSentimentExecutor';
import { ExtractInformationExecutor } from './actionExecutors/extractInformationExecutor';
import { GenerateSummaryExecutor } from './actionExecutors/generateSummaryExecutor';

export class ActionExecutorRegistry {
  private static executors: Map<string, ActionNodeExecutor> = new Map();

  private static addTagExecutor = new AddTagExecutor();
  private static removeTagExecutor = new RemoveTagExecutor();
  private static updateContactExecutor = new UpdateContactExecutor();
  private static assignAgentExecutor = new AssignAgentExecutor();
  private static changeStatusExecutor = new ChangeConversationStatusExecutor();
  private static sendInternalNoteExecutor = new SendInternalNoteExecutor();
  private static createTaskExecutor = new CreateTaskExecutor();
  private static sendWhatsAppMessageExecutor = new SendWhatsAppMessageExecutor();
  private static sendWhatsAppTemplateExecutor = new SendWhatsAppTemplateExecutor();
  private static sendMediaExecutor = new SendMediaExecutor();
  private static aiAgentExecutor = new AiAgentExecutor();
  private static analyzeSentimentExecutor = new AnalyzeSentimentExecutor();
  private static extractInformationExecutor = new ExtractInformationExecutor();
  private static generateSummaryExecutor = new GenerateSummaryExecutor();

  /**
   * Register a custom action executor.
   */
  static register(actionType: string, executor: ActionNodeExecutor): void {
    this.executors.set(actionType.toUpperCase().trim(), executor);
  }

  /**
   * Resolves the specialized executor for a given action node type.
   */
  static resolve(actionType: string): ActionNodeExecutor | null {
    const rawType = (actionType || '').toUpperCase().trim();

    // Check custom overrides first
    if (this.executors.has(rawType)) {
      return this.executors.get(rawType)!;
    }

    switch (rawType) {
      case 'ADD_TAG':
        return this.addTagExecutor;
      case 'REMOVE_TAG':
        return this.removeTagExecutor;
      case 'UPDATE_CONTACT':
        return this.updateContactExecutor;
      case 'ASSIGN_AGENT':
        return this.assignAgentExecutor;
      case 'CHANGE_CONVERSATION_STATUS':
      case 'CHANGE_STATUS':
        return this.changeStatusExecutor;
      case 'SEND_INTERNAL_NOTE':
        return this.sendInternalNoteExecutor;
      case 'CREATE_TASK':
        return this.createTaskExecutor;
      case 'SEND_WHATSAPP_MESSAGE':
      case 'WHATSAPP_MESSAGE':
      case 'SEND_MESSAGE':
        return this.sendWhatsAppMessageExecutor;
      case 'SEND_WHATSAPP_TEMPLATE':
      case 'WHATSAPP_TEMPLATE':
      case 'SEND_TEMPLATE':
        return this.sendWhatsAppTemplateExecutor;
      case 'SEND_MEDIA':
      case 'WHATSAPP_MEDIA':
        return this.sendMediaExecutor;
      case 'AI_AGENT':
      case 'AGENT_HANDOFF':
        return this.aiAgentExecutor;
      case 'ANALYZE_SENTIMENT':
      case 'SENTIMENT_ANALYSIS':
        return this.analyzeSentimentExecutor;
      case 'EXTRACT_INFORMATION':
      case 'EXTRACT_INFO':
        return this.extractInformationExecutor;
      case 'GENERATE_SUMMARY':
      case 'SUMMARIZE_CONVERSATION':
        return this.generateSummaryExecutor;
      default:
        return null;
    }
  }

  /**
   * Clears custom registered executors (useful for test resets).
   */
  static clearCustomExecutors(): void {
    this.executors.clear();
  }
}
