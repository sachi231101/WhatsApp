import { NodeDefinition } from '../types';

const UTILITY_COLOR = {
  bg: 'bg-blue-50',
  text: 'text-blue-700',
  border: 'border-blue-200',
  gradient: 'from-blue-500 to-cyan-600',
};

export const UTILITY_DEFINITIONS: NodeDefinition[] = [
  {
    type: 'WAIT',
    category: 'utilities',
    label: 'Wait / Delay',
    description: 'Pauses workflow execution for a designated duration before continuing.',
    icon: 'Hourglass',
    color: UTILITY_COLOR,
    inputs: [],
    outputs: [
      {
        id: 'next',
        label: 'NEXT',
        description: 'Fires when wait period expires',
        badgeColor: 'bg-blue-100 text-blue-800',
      },
    ],
    defaultConfig: {
      durationValue: 15,
      durationUnit: 'MINUTES', // 'SECONDS' | 'MINUTES' | 'HOURS' | 'DAYS'
    },
    configFields: [
      {
        name: 'durationValue',
        label: 'Duration',
        type: 'number',
        defaultValue: 15,
      },
      {
        name: 'durationUnit',
        label: 'Unit',
        type: 'select',
        defaultValue: 'MINUTES',
        options: [
          { label: 'Minutes', value: 'MINUTES' },
          { label: 'Hours', value: 'HOURS' },
          { label: 'Days', value: 'DAYS' },
        ],
      },
    ],
    validator: (config) => {
      const errors: string[] = [];
      if (typeof config.durationValue !== 'number' || config.durationValue <= 0) {
        errors.push('Wait duration must be a positive number');
      }
      return { valid: errors.length === 0, errors };
    },
    executorRef: 'executor:utility:wait',
    isImplemented: true,
  },
  {
    type: 'CHECK_REPLY',
    category: 'utilities',
    label: 'Check Reply Listener',
    description: 'Waits for customer reply within a time window and branches on response or timeout.',
    icon: 'HelpCircle',
    color: UTILITY_COLOR,
    inputs: [{ context: 'conversation', required: true }],
    outputs: [
      {
        id: 'replied',
        label: 'REPLIED',
        description: 'Customer sent a response within window',
        badgeColor: 'bg-emerald-100 text-emerald-800',
      },
      {
        id: 'timeout',
        label: 'TIMEOUT',
        description: 'Time expired without customer response',
        badgeColor: 'bg-rose-100 text-rose-800',
      },
    ],
    defaultConfig: {
      timeoutHours: 24,
    },
    validator: () => ({ valid: true, errors: [] }),
    executorRef: 'executor:utility:check_reply',
    isImplemented: false,
    comingSoonNotice: 'Customer reply listener utility coming in next update.',
  },
  {
    type: 'BRANCH',
    category: 'utilities',
    label: 'Logical Branch',
    description: 'Evaluates logical expression or boolean value and splits workflow into TRUE and FALSE paths.',
    icon: 'Split',
    color: UTILITY_COLOR,
    inputs: [],
    outputs: [
      {
        id: 'true',
        label: 'TRUE',
        description: 'Branch if logical condition is true',
        badgeColor: 'bg-emerald-100 text-emerald-800',
      },
      {
        id: 'false',
        label: 'FALSE',
        description: 'Branch if logical condition is false',
        badgeColor: 'bg-rose-100 text-rose-800',
      },
    ],
    defaultConfig: {
      expression: 'true',
    },
    validator: () => ({ valid: true, errors: [] }),
    executorRef: 'executor:utility:branch',
    isImplemented: true,
  },
];
