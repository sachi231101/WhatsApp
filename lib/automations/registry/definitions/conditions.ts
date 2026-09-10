import { NodeDefinition } from '../types';

const CONDITION_COLOR = {
  bg: 'bg-amber-50',
  text: 'text-amber-700',
  border: 'border-amber-200',
  gradient: 'from-amber-500 to-orange-600',
};

export const CONDITION_DEFINITIONS: NodeDefinition[] = [
  {
    type: 'MESSAGE_CONTAINS',
    category: 'conditions',
    label: 'Message Contains',
    description: 'Branches workflow based on whether the incoming message text contains target phrases.',
    icon: 'Filter',
    color: CONDITION_COLOR,
    inputs: [
      {
        context: 'message',
        required: true,
        description: 'Requires an incoming message in the execution context.',
      },
    ],
    outputs: [
      {
        id: 'yes',
        label: 'YES',
        description: 'Branch followed when condition evaluates to TRUE',
        badgeColor: 'bg-emerald-100 text-emerald-800',
      },
      {
        id: 'no',
        label: 'NO',
        description: 'Branch followed when condition evaluates to FALSE',
        badgeColor: 'bg-rose-100 text-rose-800',
      },
    ],
    defaultConfig: {
      matchOperator: 'CONTAINS', // 'CONTAINS' | 'EXACT' | 'REGEX'
      phrases: ['pricing', 'help', 'info'],
      caseSensitive: false,
    },
    configFields: [
      {
        name: 'matchOperator',
        label: 'Operator',
        type: 'select',
        defaultValue: 'CONTAINS',
        options: [
          { label: 'Contains any phrase', value: 'CONTAINS' },
          { label: 'Contains all phrases', value: 'CONTAINS_ALL' },
          { label: 'Exact match', value: 'EXACT' },
          { label: 'Regular expression', value: 'REGEX' },
        ],
      },
      {
        name: 'phrases',
        label: 'Match Phrases',
        type: 'tags',
        defaultValue: ['pricing', 'help'],
        placeholder: 'Enter phrases to evaluate',
      },
    ],
    validator: (config) => {
      const errors: string[] = [];
      if (!Array.isArray(config.phrases) || config.phrases.length === 0) {
        errors.push('At least one phrase is required for Message Contains evaluation');
      }
      return { valid: errors.length === 0, errors };
    },
    executorRef: 'executor:condition:message_contains',
    isImplemented: true,
  },
  {
    type: 'CONTACT_TAG',
    category: 'conditions',
    label: 'Contact Tag',
    description: 'Branches workflow depending on whether the contact record has or lacks specific tags.',
    icon: 'Tag',
    color: CONDITION_COLOR,
    inputs: [
      {
        context: 'contact',
        required: true,
        description: 'Requires contact record context.',
      },
    ],
    outputs: [
      {
        id: 'match',
        label: 'MATCH',
        description: 'Contact has the specified tag criteria',
        badgeColor: 'bg-emerald-100 text-emerald-800',
      },
      {
        id: 'no_match',
        label: 'NO MATCH',
        description: 'Contact does not meet tag criteria',
        badgeColor: 'bg-slate-100 text-slate-800',
      },
    ],
    defaultConfig: {
      tagOperator: 'HAS_ANY', // 'HAS_ANY' | 'HAS_ALL' | 'DOES_NOT_HAVE'
      tags: ['VIP'],
    },
    configFields: [
      {
        name: 'tagOperator',
        label: 'Tag Rule',
        type: 'select',
        defaultValue: 'HAS_ANY',
        options: [
          { label: 'Has any of these tags', value: 'HAS_ANY' },
          { label: 'Has all of these tags', value: 'HAS_ALL' },
          { label: 'Does not have these tags', value: 'DOES_NOT_HAVE' },
        ],
      },
      {
        name: 'tags',
        label: 'Tags',
        type: 'tags',
        defaultValue: ['VIP'],
      },
    ],
    validator: (config) => {
      const errors: string[] = [];
      if (!Array.isArray(config.tags) || config.tags.length === 0) {
        errors.push('At least one tag name must be specified');
      }
      return { valid: errors.length === 0, errors };
    },
    executorRef: 'executor:condition:contact_tag',
    isImplemented: true,
  },
  {
    type: 'LEAD_SCORE',
    category: 'conditions',
    label: 'Lead Score',
    description: 'Branches based on contact engagement score (e.g. greater than 50).',
    icon: 'Award',
    color: CONDITION_COLOR,
    inputs: [{ context: 'contact', required: true }],
    outputs: [
      { id: 'match', label: 'MATCH', badgeColor: 'bg-emerald-100 text-emerald-800' },
      { id: 'no_match', label: 'NO MATCH', badgeColor: 'bg-slate-100 text-slate-800' },
    ],
    defaultConfig: {
      operator: 'GREATER_THAN',
      score: 50,
    },
    validator: () => ({ valid: true, errors: [] }),
    executorRef: 'executor:condition:lead_score',
    isImplemented: true,
  },
  {
    type: 'CUSTOM_FIELD',
    category: 'conditions',
    label: 'Custom Field',
    description: 'Branches based on custom metadata attributes stored on the contact or conversation.',
    icon: 'Sliders',
    color: CONDITION_COLOR,
    inputs: [{ context: 'contact', required: true }],
    outputs: [
      { id: 'match', label: 'MATCH', badgeColor: 'bg-emerald-100 text-emerald-800' },
      { id: 'no_match', label: 'NO MATCH', badgeColor: 'bg-slate-100 text-slate-800' },
    ],
    defaultConfig: {
      fieldName: '',
      operator: 'EQUALS',
      fieldValue: '',
    },
    validator: () => ({ valid: true, errors: [] }),
    executorRef: 'executor:condition:custom_field',
    isImplemented: true,
  },
  {
    type: 'TIME_CONDITION',
    category: 'conditions',
    label: 'Time Condition',
    description: 'Branches depending on whether current time falls within business operating hours or specific weekdays.',
    icon: 'Clock',
    color: CONDITION_COLOR,
    inputs: [],
    outputs: [
      { id: 'match', label: 'MATCH', description: 'Within business hours', badgeColor: 'bg-emerald-100 text-emerald-800' },
      { id: 'no_match', label: 'NO MATCH', description: 'Outside business hours', badgeColor: 'bg-slate-100 text-slate-800' },
    ],
    defaultConfig: {
      timezone: 'UTC',
      businessHours: { start: '09:00', end: '17:00' },
      workingDays: [1, 2, 3, 4, 5],
    },
    validator: () => ({ valid: true, errors: [] }),
    executorRef: 'executor:condition:time_condition',
    isImplemented: true,
  },
  {
    type: 'CONVERSATION_STATUS',
    category: 'conditions',
    label: 'Conversation Status',
    description: 'Branches according to current inbox conversation state (OPEN, PENDING, CLOSED).',
    icon: 'CheckCircle2',
    color: CONDITION_COLOR,
    inputs: [
      {
        context: 'conversation',
        required: true,
        description: 'Requires an active conversation thread context.',
      },
    ],
    outputs: [
      { id: 'match', label: 'MATCH', badgeColor: 'bg-emerald-100 text-emerald-800' },
      { id: 'no_match', label: 'NO MATCH', badgeColor: 'bg-slate-100 text-slate-800' },
    ],
    defaultConfig: {
      targetStatus: 'OPEN', // 'OPEN' | 'PENDING' | 'RESOLVED' | 'CLOSED'
    },
    configFields: [
      {
        name: 'targetStatus',
        label: 'Status Check',
        type: 'select',
        defaultValue: 'OPEN',
        options: [
          { label: 'Open', value: 'OPEN' },
          { label: 'Pending', value: 'PENDING' },
          { label: 'Resolved', value: 'RESOLVED' },
          { label: 'Closed', value: 'CLOSED' },
        ],
      },
    ],
    validator: (config) => {
      const errors: string[] = [];
      if (!config.targetStatus) {
        errors.push('Target conversation status is required');
      }
      return { valid: errors.length === 0, errors };
    },
    executorRef: 'executor:condition:conversation_status',
    isImplemented: true,
  },
  {
    type: 'CONVERSATION_ASSIGNEE',
    category: 'conditions',
    label: 'Conversation Assignee',
    description: 'Branches based on whether the conversation is assigned to a specific team member or unassigned.',
    icon: 'UserCheck',
    color: CONDITION_COLOR,
    inputs: [{ context: 'conversation', required: true }],
    outputs: [
      { id: 'match', label: 'MATCH', badgeColor: 'bg-emerald-100 text-emerald-800' },
      { id: 'no_match', label: 'NO MATCH', badgeColor: 'bg-slate-100 text-slate-800' },
    ],
    defaultConfig: {
      assigneeState: 'IS_ASSIGNED', // 'IS_ASSIGNED' | 'IS_UNASSIGNED' | 'SPECIFIC_USER'
      assignedUserId: null,
    },
    validator: () => ({ valid: true, errors: [] }),
    executorRef: 'executor:condition:conversation_assignee',
    isImplemented: true,
  },
  {
    type: 'AI_INTENT',
    category: 'conditions',
    label: 'AI Intent Classification',
    description: 'Uses an LLM to classify customer intent (e.g. sales inquiry vs support issue).',
    icon: 'Sparkles',
    color: CONDITION_COLOR,
    inputs: [{ context: 'message', required: true }],
    outputs: [
      { id: 'match', label: 'MATCH', badgeColor: 'bg-emerald-100 text-emerald-800' },
      { id: 'no_match', label: 'NO MATCH', badgeColor: 'bg-slate-100 text-slate-800' },
    ],
    defaultConfig: {
      targetIntent: 'SALES_INQUIRY',
      confidenceThreshold: 0.75,
    },
    validator: () => ({ valid: true, errors: [] }),
    executorRef: 'executor:condition:ai_intent',
    isImplemented: true,
  },
];
