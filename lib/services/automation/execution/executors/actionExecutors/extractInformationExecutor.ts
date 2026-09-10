import { AutomationNodeRecord } from '../../../types';
import { ExecutionContext, NodeExecutionResult, ActionNodeExecutor } from '../../types';
import { sql } from '@/lib/db';
import { ensureCoreTables } from '@/lib/auth/context';
import { AIProviderFactory } from '@/lib/ai/providers/aiProviderFactory';
import { ConversationContextBuilder } from '@/lib/ai/contextBuilder';
import { executionObservability } from '../../executionObservability';

const ALLOWED_FIELD_TYPES = ['string', 'number', 'boolean', 'date', 'enum'] as const;
type FieldType = (typeof ALLOWED_FIELD_TYPES)[number];

export interface ExtractionFieldConfig {
  name: string;
  type: FieldType;
  options?: string[];
  required?: boolean;
  description?: string;
}

export class ExtractInformationExecutor implements ActionNodeExecutor {
  async execute(
    node: AutomationNodeRecord,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    const config = node.configuration || {};
    const { workspaceId, projectId, executionId, conversationId } = context;

    const rawFields: ExtractionFieldConfig[] = config.fields || config.fieldsToExtract;
    if (!Array.isArray(rawFields) || rawFields.length === 0) {
      return {
        status: 'FAILED',
        errorCode: 'INVALID_NODE_CONFIGURATION',
        errorMessage: 'Extract Information node requires at least one field definition in "fields".',
      };
    }

    // 1. Validate Field Definitions (No arbitrary code/sql allowed)
    const fields: ExtractionFieldConfig[] = [];
    for (const f of rawFields) {
      const fieldName = typeof f === 'string' ? f : f?.name;
      const rawType = typeof f === 'string' ? 'string' : (f?.type || 'string').toLowerCase().trim();

      if (!fieldName || typeof fieldName !== 'string' || !fieldName.trim()) {
        continue;
      }

      if (!ALLOWED_FIELD_TYPES.includes(rawType as FieldType)) {
        return {
          status: 'FAILED',
          errorCode: 'INVALID_NODE_CONFIGURATION',
          errorMessage: `Unsupported extraction field type: "${rawType}" for field "${fieldName}". Supported types: ${ALLOWED_FIELD_TYPES.join(', ')}.`,
        };
      }

      fields.push({
        name: fieldName.trim(),
        type: rawType as FieldType,
        options: Array.isArray(f.options) ? f.options.map((opt: any) => String(opt).trim()) : undefined,
        required: Boolean(f.required),
        description: f.description,
      });
    }

    if (fields.length === 0) {
      return {
        status: 'FAILED',
        errorCode: 'INVALID_NODE_CONFIGURATION',
        errorMessage: 'No valid field definitions found in configuration.',
      };
    }

    try {
      await ensureCoreTables();

      // 2. Resolve Text to Extract From
      let sourceText =
        context.variables?.message?.body ||
        context.variables?.body ||
        context.variables?.lastUserMessage ||
        '';

      if (!sourceText && conversationId) {
        const convContext = await ConversationContextBuilder.buildContext({
          workspaceId,
          projectId,
          conversationId,
          maxRecentMessages: 5,
        });
        if (convContext.messages.length > 0) {
          sourceText = convContext.messages
            .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
            .join('\n');
        }
      }

      if (!sourceText || !sourceText.trim()) {
        return {
          status: 'FAILED',
          errorCode: 'INVALID_CONFIGURATION',
          errorMessage: 'No message or conversation text available to extract information from.',
        };
      }

      // 3. Build Strict Schema Extraction Prompt
      const fieldDescriptions = fields.map((f) => {
        let desc = `- "${f.name}" (${f.type})`;
        if (f.description) desc += `: ${f.description}`;
        if (f.type === 'enum' && f.options && f.options.length > 0) {
          desc += ` [Allowed values: ${f.options.join(', ')}]`;
        }
        if (f.required) desc += ' (REQUIRED)';
        return desc;
      }).join('\n');

      const systemPrompt = [
        'You are an entity extraction engine for a WhatsApp Business automation platform.',
        'Extract the requested business fields from the conversation text into a strict JSON object matching the requested schema.',
        'Fields to extract:',
        fieldDescriptions,
        '',
        'Rules:',
        '1. Return ONLY a valid JSON object whose keys match the requested field names.',
        '2. Convert numbers to numeric types (e.g. 50000, not "50000").',
        '3. Convert booleans to true/false boolean types.',
        '4. Format dates as ISO strings (YYYY-MM-DD).',
        '5. For enums, only pick from the allowed values list.',
        '6. If a non-required field is not found or cannot be inferred, set its value to null.',
        '7. Do NOT include markdown code blocks or commentary.',
      ].join('\n');

      // 4. Invoke Central AI Provider
      const provider = AIProviderFactory.getProvider('openai');
      const completion = await provider.generateStructuredOutput<Record<string, any>>({
        systemPrompt,
        messages: [{ role: 'user', content: sourceText.slice(0, 2500) }],
        responseFormat: 'json',
        temperature: 0.1,
        maxTokens: 300,
      });

      const rawExtracted = completion.data || {};
      const validatedExtracted: Record<string, any> = {};

      // 5. Strict Type & Schema Enforcement
      for (const field of fields) {
        const val = rawExtracted[field.name];

        if (val === undefined || val === null || (typeof val === 'string' && !val.trim())) {
          if (field.required) {
            return {
              status: 'FAILED',
              errorCode: 'INVALID_OUTPUT_SCHEMA',
              errorMessage: `Required extraction field "${field.name}" was not found in customer text.`,
            };
          }
          continue;
        }

        // Validate type
        switch (field.type) {
          case 'number': {
            const num = Number(val);
            if (isNaN(num)) {
              if (field.required) {
                return {
                  status: 'FAILED',
                  errorCode: 'INVALID_OUTPUT_SCHEMA',
                  errorMessage: `Extracted field "${field.name}" expected number, received: "${val}".`,
                };
              }
            } else {
              validatedExtracted[field.name] = num;
            }
            break;
          }

          case 'boolean': {
            if (typeof val === 'boolean') {
              validatedExtracted[field.name] = val;
            } else if (String(val).toLowerCase() === 'true') {
              validatedExtracted[field.name] = true;
            } else if (String(val).toLowerCase() === 'false') {
              validatedExtracted[field.name] = false;
            } else if (field.required) {
              return {
                status: 'FAILED',
                errorCode: 'INVALID_OUTPUT_SCHEMA',
                errorMessage: `Extracted field "${field.name}" expected boolean, received: "${val}".`,
              };
            }
            break;
          }

          case 'date': {
            const dateStr = String(val).trim();
            if (isNaN(Date.parse(dateStr))) {
              if (field.required) {
                return {
                  status: 'FAILED',
                  errorCode: 'INVALID_OUTPUT_SCHEMA',
                  errorMessage: `Extracted field "${field.name}" expected valid date, received: "${val}".`,
                };
              }
            } else {
              validatedExtracted[field.name] = dateStr;
            }
            break;
          }

          case 'enum': {
            const enumVal = String(val).trim();
            if (field.options && field.options.length > 0) {
              const matchedOption = field.options.find(
                (opt) => opt.toLowerCase() === enumVal.toLowerCase()
              );
              if (!matchedOption) {
                if (field.required) {
                  return {
                    status: 'FAILED',
                    errorCode: 'INVALID_OUTPUT_SCHEMA',
                    errorMessage: `Extracted field "${field.name}" value "${enumVal}" is not one of allowed enum options: ${field.options.join(', ')}.`,
                  };
                }
              } else {
                validatedExtracted[field.name] = matchedOption;
              }
            } else {
              validatedExtracted[field.name] = enumVal;
            }
            break;
          }

          case 'string':
          default: {
            validatedExtracted[field.name] = String(val).trim();
            break;
          }
        }
      }

      const latencyMs = completion.raw.latencyMs || (Date.now() - startTime);

      // 6. Record Usage in Step 7 ai_usage
      await sql`
        INSERT INTO ai_usage (
          workspace_id, project_id, conversation_id,
          provider, model, input_tokens, output_tokens, total_tokens, latency_ms,
          status, source, metadata
        )
        VALUES (
          ${workspaceId}, ${projectId}, ${conversationId || null},
          ${completion.raw.provider}, ${completion.raw.model},
          ${completion.raw.usage.promptTokens}, ${completion.raw.usage.completionTokens}, ${completion.raw.usage.totalTokens},
          ${latencyMs}, 'SUCCESS', 'AUTOMATION',
          ${JSON.stringify({ automationId: context.automationId, executionId, nodeId: node.id, action: 'EXTRACT_INFORMATION' })}
        )
      `.catch((): null => null);

      await executionObservability.log({
        action: 'automation.ai.completed',
        workspaceId,
        projectId,
        automationId: context.automationId,
        executionId,
        nodeId: node.id,
        nodeType: node.type,
        extractedKeys: Object.keys(validatedExtracted),
        durationMs: latencyMs,
      });

      return {
        status: 'COMPLETED',
        output: {
          action: 'EXTRACT_INFORMATION',
          fieldsExtracted: Object.keys(validatedExtracted),
          extracted: validatedExtracted,
          latencyMs,
        },
      };
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      const errMsg = String(err?.message || 'Unknown information extraction error');

      let errorCode = 'AI_PROVIDER_UNAVAILABLE';
      if (/timeout|abort/i.test(errMsg)) {
        errorCode = 'AI_TIMEOUT';
      } else if (/rate limit|429/i.test(errMsg)) {
        errorCode = 'AI_RATE_LIMITED';
      } else if (/parse|json/i.test(errMsg)) {
        errorCode = 'INVALID_OUTPUT_SCHEMA';
      }

      await executionObservability.log({
        action: 'automation.ai.failed',
        workspaceId,
        projectId,
        automationId: context.automationId,
        executionId,
        nodeId: node.id,
        nodeType: node.type,
        errorCode,
        errorMessage: errMsg,
        durationMs: latencyMs,
      });

      return {
        status: 'FAILED',
        errorCode,
        errorMessage: `Extract Information execution failed: ${errMsg}`,
      };
    }
  }
}
