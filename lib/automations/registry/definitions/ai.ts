import { NodeDefinition } from '../types';

const AI_COLOR = {
  bg: 'bg-indigo-50',
  text: 'text-indigo-700',
  border: 'border-indigo-200',
  gradient: 'from-indigo-500 to-violet-600',
};

export const AI_DEFINITIONS: NodeDefinition[] = [
  {
    type: 'AI_AGENT',
    category: 'ai',
    label: 'AI Agent',
    description: 'Hands off conversation handling to an autonomous AI agent backed by project knowledge base.',
    icon: 'Bot',
    color: AI_COLOR,
    inputs: [
      { context: 'conversation', required: true },
      { context: 'message', required: true },
    ],
    outputs: [
      {
        id: 'completed',
        label: 'COMPLETED',
        description: 'Agent answered inquiry or resolved goal',
        badgeColor: 'bg-emerald-100 text-emerald-800',
      },
      {
        id: 'escalate',
        label: 'ESCALATE',
        description: 'Agent requested human handoff or confidence was low',
        badgeColor: 'bg-amber-100 text-amber-800',
      },
    ],
    defaultConfig: {
      agentId: '',
      instruction: '',
      useKnowledge: true,
      maxTurns: 5,
      temperature: 0.3,
    },
    configFields: [
      {
        name: 'agentId',
        label: 'AI Agent ID',
        type: 'string',
        placeholder: 'Select or paste Agent ID',
      },
      {
        name: 'instruction',
        label: 'Additional Runtime Instruction',
        type: 'string',
        placeholder: 'Optional task instruction (e.g. Focus on pricing)',
      },
      {
        name: 'useKnowledge',
        label: 'Use Knowledge Base (RAG)',
        type: 'boolean',
        defaultValue: true,
      },
    ],
    validator: (config) => {
      const errors: string[] = [];
      if (!config.agentId || !String(config.agentId).trim()) {
        errors.push('AI Agent selection is required');
      }
      return { valid: errors.length === 0, errors };
    },
    executorRef: 'executor:ai:agent_handoff',
    isImplemented: true,
  },
  {
    type: 'ANALYZE_SENTIMENT',
    category: 'ai',
    label: 'Analyze Sentiment',
    description: 'Evaluates customer tone and emotional sentiment across POSITIVE, NEUTRAL, NEGATIVE, and MIXED.',
    icon: 'Smile',
    color: AI_COLOR,
    inputs: [{ context: 'message', required: true }],
    outputs: [
      { id: 'positive', label: 'POSITIVE', badgeColor: 'bg-emerald-100 text-emerald-800' },
      { id: 'neutral', label: 'NEUTRAL', badgeColor: 'bg-slate-100 text-slate-800' },
      { id: 'negative', label: 'NEGATIVE', badgeColor: 'bg-rose-100 text-rose-800' },
    ],
    defaultConfig: {
      source: 'current_message',
      minConfidence: 0.6,
    },
    configFields: [
      {
        name: 'source',
        label: 'Text Source',
        type: 'select',
        options: [
          { label: 'Current Message', value: 'current_message' },
          { label: 'Recent Conversation', value: 'conversation' },
        ],
        defaultValue: 'current_message',
      },
      {
        name: 'minConfidence',
        label: 'Minimum Confidence (0.0 - 1.0)',
        type: 'number',
        defaultValue: 0.6,
      },
    ],
    validator: () => ({ valid: true, errors: [] }),
    executorRef: 'executor:ai:sentiment_analysis',
    isImplemented: true,
  },
  {
    type: 'EXTRACT_INFORMATION',
    category: 'ai',
    label: 'Extract Information',
    description: 'Extracts structured typed entities (e.g. course, budget, dates, enums) from text using AI.',
    icon: 'FileSearch',
    color: AI_COLOR,
    inputs: [{ context: 'message', required: true }],
    outputs: [
      { id: 'default', label: 'NEXT', badgeColor: 'bg-indigo-100 text-indigo-800' },
    ],
    defaultConfig: {
      fields: [
        { name: 'course', type: 'string' },
        { name: 'budget', type: 'number' },
      ],
    },
    configFields: [
      {
        name: 'fields',
        label: 'Fields to Extract',
        type: 'json',
      },
    ],
    validator: (config) => {
      const errors: string[] = [];
      const fields = config.fields || config.fieldsToExtract;
      if (!Array.isArray(fields) || fields.length === 0) {
        errors.push('At least one field definition is required');
      }
      return { valid: errors.length === 0, errors };
    },
    executorRef: 'executor:ai:extract_info',
    isImplemented: true,
  },
  {
    type: 'GENERATE_SUMMARY',
    category: 'ai',
    label: 'Generate Summary',
    description: 'Generates an executive internal AI summary of recent messages in the conversation.',
    icon: 'FileText',
    color: AI_COLOR,
    inputs: [{ context: 'conversation', required: true }],
    outputs: [
      { id: 'default', label: 'NEXT', badgeColor: 'bg-indigo-100 text-indigo-800' },
    ],
    defaultConfig: {
      scope: 'recent',
      focus: '',
      summaryLength: 'SHORT',
    },
    configFields: [
      {
        name: 'scope',
        label: 'Summary Scope',
        type: 'select',
        options: [
          { label: 'Recent Messages (Last 10)', value: 'recent' },
          { label: 'Extended Conversation (Last 20)', value: 'all' },
        ],
        defaultValue: 'recent',
      },
      {
        name: 'focus',
        label: 'Focus Area',
        type: 'string',
        placeholder: 'e.g. Customer requirements, budget constraints',
      },
    ],
    validator: () => ({ valid: true, errors: [] }),
    executorRef: 'executor:ai:generate_summary',
    isImplemented: true,
  },
];
