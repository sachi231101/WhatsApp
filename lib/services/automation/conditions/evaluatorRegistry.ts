import { ConditionEvaluator } from './types';
import { MessageContainsEvaluator } from './evaluators/messageContainsEvaluator';
import { ContactTagEvaluator } from './evaluators/contactTagEvaluator';
import { LeadScoreEvaluator } from './evaluators/leadScoreEvaluator';
import { CustomFieldEvaluator } from './evaluators/customFieldEvaluator';
import { TimeConditionEvaluator } from './evaluators/timeConditionEvaluator';
import { ConversationStatusEvaluator } from './evaluators/conversationStatusEvaluator';
import { ConversationAssigneeEvaluator } from './evaluators/conversationAssigneeEvaluator';
import { AIIntentEvaluator } from './evaluators/aiIntentEvaluator';

export class ConditionEvaluatorRegistry {
  private static evaluators: Map<string, ConditionEvaluator> = new Map();

  static {
    this.register(new MessageContainsEvaluator());
    this.register(new ContactTagEvaluator());
    this.register(new LeadScoreEvaluator());
    this.register(new CustomFieldEvaluator());
    this.register(new TimeConditionEvaluator());
    this.register(new ConversationStatusEvaluator());
    this.register(new ConversationAssigneeEvaluator());
    this.register(new AIIntentEvaluator());
  }

  /**
   * Registers a condition evaluator. Exactly one authoritative evaluator per condition type.
   */
  static register(evaluator: ConditionEvaluator): void {
    this.evaluators.set(evaluator.type.toUpperCase().trim(), evaluator);
  }

  /**
   * Retrieves the authoritative evaluator for a given condition node type.
   */
  static get(type: string): ConditionEvaluator | null {
    if (!type) return null;
    return this.evaluators.get(type.toUpperCase().trim()) || null;
  }

  /**
   * Returns list of all registered condition types.
   */
  static getSupportedTypes(): string[] {
    return Array.from(this.evaluators.keys());
  }
}
