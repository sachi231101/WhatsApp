import { ConditionEvaluator, ConditionExecutionContext, ConditionEvaluationResult } from '../types';
import { evaluateStringOperator, normalizeString } from '../operators';

export class MessageContainsEvaluator implements ConditionEvaluator {
  readonly type = 'MESSAGE_CONTAINS';

  async evaluate(
    configuration: Record<string, any>,
    context: ConditionExecutionContext
  ): Promise<ConditionEvaluationResult> {
    const rawMessage =
      context.message?.body ||
      context.message?.caption ||
      context.message?.text ||
      (typeof context.message === 'string' ? context.message : null);

    if (rawMessage === null || rawMessage === undefined) {
      return {
        matched: false,
        branch: 'NO',
        reason: 'Message content is not available in execution context',
        errorCode: 'MISSING_MESSAGE',
      };
    }

    const operator = String(configuration.operator || configuration.matchOperator || 'contains').toLowerCase();
    const caseSensitive = Boolean(configuration.caseSensitive);
    const wholeWord = Boolean(configuration.wholeWord);

    // Collect target phrases
    const phrases: string[] = [];
    if (typeof configuration.value === 'string' && configuration.value.trim()) {
      phrases.push(configuration.value.trim());
    } else if (typeof configuration.phrase === 'string' && configuration.phrase.trim()) {
      phrases.push(configuration.phrase.trim());
    } else if (typeof configuration.text === 'string' && configuration.text.trim()) {
      phrases.push(configuration.text.trim());
    }
    if (Array.isArray(configuration.phrases)) {
      for (const p of configuration.phrases) {
        if (typeof p === 'string' && p.trim()) phrases.push(p.trim());
      }
    }

    if (phrases.length === 0) {
      return {
        matched: false,
        branch: 'NO',
        reason: 'No phrases configured for Message Contains evaluation',
        errorCode: 'INVALID_CONFIGURATION',
      };
    }

    let matched = false;
    let mappedOp = operator;
    if (mappedOp === 'exact') mappedOp = 'equals';

    if (operator === 'contains_all') {
      matched = phrases.every((p) =>
        evaluateStringOperator('contains', rawMessage, p, { caseSensitive, wholeWord })
      );
    } else if (operator === 'not_contains') {
      matched = phrases.every((p) =>
        evaluateStringOperator('not_contains', rawMessage, p, { caseSensitive, wholeWord })
      );
    } else if (operator === 'not_equals') {
      matched = phrases.every((p) =>
        evaluateStringOperator('not_equals', rawMessage, p, { caseSensitive, wholeWord })
      );
    } else {
      // contains, equals, starts_with, ends_with, regex
      matched = phrases.some((p) =>
        evaluateStringOperator(mappedOp, rawMessage, p, { caseSensitive, wholeWord })
      );
    }

    return {
      matched,
      branch: matched ? 'YES' : 'NO',
      evaluatedValue: normalizeString(rawMessage, caseSensitive),
      operator,
      metadata: {
        targetPhrases: phrases,
        caseSensitive,
        wholeWord,
      },
    };
  }
}
