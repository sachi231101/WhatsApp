import { ConditionEvaluator, ConditionExecutionContext, ConditionEvaluationResult } from '../types';
import { IntentDetectionService } from '../intentDetectionService';

export class AIIntentEvaluator implements ConditionEvaluator {
  readonly type = 'AI_INTENT';

  async evaluate(
    configuration: Record<string, any>,
    context: ConditionExecutionContext
  ): Promise<ConditionEvaluationResult> {
    const targetIntent = String(configuration.intent || configuration.targetIntent || '').toLowerCase().trim();

    if (!targetIntent) {
      return {
        matched: false,
        branch: 'NO',
        reason: 'Target intent is required for AI Intent evaluation',
        errorCode: 'INVALID_CONFIGURATION',
      };
    }

    const minConfidence = Number(configuration.minimumConfidence ?? configuration.confidenceThreshold ?? 0.75);

    let detectedIntent: string | null = null;
    let confidence: number = 0;

    // 1. Check if intent was pre-computed in execution context
    if (context.aiIntent && context.aiIntent.intent) {
      detectedIntent = context.aiIntent.intent.toLowerCase().trim();
      confidence = typeof context.aiIntent.confidence === 'number' ? context.aiIntent.confidence : 1.0;
    } else {
      // 2. Otherwise detect intent lazily using message content
      const messageText =
        context.message?.body ||
        context.message?.caption ||
        (typeof context.message === 'string' ? context.message : null);

      if (!messageText || !messageText.trim()) {
        return {
          matched: false,
          branch: 'NO',
          reason: 'No message content available to classify intent',
          errorCode: 'MISSING_MESSAGE',
        };
      }

      try {
        const detection = await IntentDetectionService.detectIntent(messageText, {
          targetIntent,
        });
        detectedIntent = detection.intent;
        confidence = detection.confidence;
      } catch (err: any) {
        return {
          matched: false,
          branch: 'NO',
          reason: `AI Intent provider evaluation failed: ${err.message || String(err)}`,
          errorCode: 'AI_PROVIDER_ERROR',
        };
      }
    }

    const intentMatches = detectedIntent === targetIntent;
    const confidenceMet = confidence >= minConfidence;
    const matched = intentMatches && confidenceMet;

    return {
      matched,
      branch: matched ? 'YES' : 'NO',
      evaluatedValue: {
        detectedIntent,
        confidence,
      },
      operator: 'equals_with_min_confidence',
      metadata: {
        targetIntent,
        minimumConfidence: minConfidence,
        detectedIntent,
        actualConfidence: confidence,
        intentMatches,
        confidenceMet,
      },
    };
  }
}
