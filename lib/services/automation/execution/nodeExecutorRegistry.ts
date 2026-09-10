import { AutomationNodeRecord } from '../types';
import { NodeExecutor } from './types';
import { TriggerExecutor } from './executors/triggerExecutor';
import { ConditionExecutor } from './executors/conditionExecutor';
import { TerminalExecutor } from './executors/terminalExecutor';
import { ActionExecutor } from './executors/actionExecutor';

export class NodeExecutorRegistry {
  private static customExecutors: Map<string, NodeExecutor> = new Map();

  private static triggerExecutor = new TriggerExecutor();
  private static conditionExecutor = new ConditionExecutor();
  private static terminalExecutor = new TerminalExecutor();
  private static defaultActionExecutor = new ActionExecutor();

  /**
   * Register a custom or specialized executor for a specific node type.
   */
  static register(nodeType: string, executor: NodeExecutor): void {
    this.customExecutors.set(nodeType.toUpperCase().trim(), executor);
  }

  /**
   * Resolves the authoritative executor for a given node.
   */
  static resolve(node: AutomationNodeRecord): NodeExecutor {
    const rawType = (node.type || '').toUpperCase().trim();

    // Check custom registrations
    if (this.customExecutors.has(rawType)) {
      return this.customExecutors.get(rawType)!;
    }

    // 1. Triggers
    if (
      rawType === 'TRIGGER' ||
      rawType.includes('TRIGGER') ||
      rawType === 'WHATSAPP_INCOMING_MESSAGE' ||
      rawType === 'KEYWORD_MATCH' ||
      rawType === 'CONVERSATION_CREATED'
    ) {
      return this.triggerExecutor;
    }

    // 2. Conditions
    if (
      rawType === 'CONDITION' ||
      rawType.includes('CONDITION') ||
      rawType === 'MESSAGE_CONTAINS' ||
      rawType === 'CONTACT_TAG' ||
      rawType === 'LEAD_SCORE' ||
      rawType === 'CUSTOM_FIELD' ||
      rawType === 'CONVERSATION_STATUS' ||
      rawType === 'CONVERSATION_ASSIGNEE' ||
      rawType === 'AI_INTENT'
    ) {
      return this.conditionExecutor;
    }

    // 3. Terminal / End
    if (rawType === 'TERMINAL' || rawType === 'END' || rawType === 'WORKFLOW_END') {
      return this.terminalExecutor;
    }

    // 4. Actions
    if (
      rawType === 'ACTION' ||
      rawType.includes('ACTION') ||
      rawType === 'ADD_TAG' ||
      rawType === 'REMOVE_TAG' ||
      rawType === 'UPDATE_CONTACT' ||
      rawType === 'ASSIGN_AGENT' ||
      rawType === 'CHANGE_CONVERSATION_STATUS' ||
      rawType === 'CHANGE_STATUS' ||
      rawType === 'SEND_INTERNAL_NOTE' ||
      rawType === 'CREATE_TASK' ||
      rawType === 'SEND_WHATSAPP_MESSAGE' ||
      rawType === 'SEND_WHATSAPP_TEMPLATE' ||
      rawType === 'SEND_MEDIA' ||
      rawType === 'AI_AGENT' ||
      rawType === 'ANALYZE_SENTIMENT' ||
      rawType === 'EXTRACT_INFORMATION' ||
      rawType === 'GENERATE_SUMMARY' ||
      rawType.includes('AI_')
    ) {
      return this.defaultActionExecutor;
    }

    // 5. Default fallback
    return this.defaultActionExecutor;
  }

  /**
   * Resets registry state (useful for tests).
   */
  static clearCustomExecutors(): void {
    this.customExecutors.clear();
  }
}
