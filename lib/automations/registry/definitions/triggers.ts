import { NodeDefinition } from '../types';

const TRIGGER_COLOR = {
  bg: 'bg-emerald-50',
  text: 'text-emerald-700',
  border: 'border-emerald-200',
  gradient: 'from-emerald-500 to-teal-600',
};

const DEFAULT_TRIGGER_OUTPUT = [
  {
    id: 'default',
    label: 'NEXT',
    description: 'Fires when the trigger event occurs',
    badgeColor: 'bg-emerald-100 text-emerald-800',
  },
];

export const TRIGGER_DEFINITIONS: NodeDefinition[] = [
  {
    type: 'NEW_WHATSAPP_MESSAGE',
    category: 'triggers',
    label: 'New WhatsApp Message',
    description: 'Triggers whenever an incoming WhatsApp message is received from any contact.',
    icon: 'MessageSquare',
    color: TRIGGER_COLOR,
    inputs: [],
    outputs: DEFAULT_TRIGGER_OUTPUT,
    defaultConfig: {
      whatsappNumber: 'ALL',
      messageType: 'ALL',
      onlyNewContacts: false,
    },
    configFields: [
      {
        name: 'whatsappNumber',
        label: 'WhatsApp Phone Number',
        type: 'select',
        description: 'Specific connected number to listen on, or ALL',
        defaultValue: 'ALL',
        options: [{ label: 'All Connected Numbers', value: 'ALL' }],
      },
      {
        name: 'messageType',
        label: 'Message Type Filter',
        type: 'select',
        defaultValue: 'ALL',
        options: [
          { label: 'All Messages', value: 'ALL' },
          { label: 'Text Only', value: 'text' },
          { label: 'Media (Image, Document, Video)', value: 'media' },
        ],
      },
      {
        name: 'onlyNewContacts',
        label: 'Only New Contacts',
        type: 'boolean',
        defaultValue: false,
        description: 'Only fire if this is the first message received from the contact',
      },
    ],
    validator: (config) => {
      const errors: string[] = [];
      if (config.whatsappNumber && typeof config.whatsappNumber !== 'string') {
        errors.push('WhatsApp number must be a string identifier or ALL');
      }
      return { valid: errors.length === 0, errors };
    },
    executorRef: 'executor:trigger:new_whatsapp_message',
    isImplemented: true,
  },
  {
    type: 'KEYWORD_MATCH',
    category: 'triggers',
    label: 'Keyword Match',
    description: 'Triggers when an incoming message matches target keywords or exact phrases.',
    icon: 'Zap',
    color: TRIGGER_COLOR,
    inputs: [],
    outputs: DEFAULT_TRIGGER_OUTPUT,
    defaultConfig: {
      matchMode: 'CONTAINS', // 'EXACT' | 'CONTAINS' | 'STARTS_WITH'
      keywords: ['hello', 'hi', 'start'],
      caseSensitive: false,
    },
    configFields: [
      {
        name: 'matchMode',
        label: 'Match Mode',
        type: 'select',
        defaultValue: 'CONTAINS',
        options: [
          { label: 'Contains Any Keyword', value: 'CONTAINS' },
          { label: 'Exact Match', value: 'EXACT' },
          { label: 'Starts With Keyword', value: 'STARTS_WITH' },
        ],
      },
      {
        name: 'keywords',
        label: 'Target Keywords',
        type: 'tags',
        defaultValue: ['hello', 'hi', 'start'],
        placeholder: 'Enter keywords separated by commas',
      },
      {
        name: 'caseSensitive',
        label: 'Case Sensitive',
        type: 'boolean',
        defaultValue: false,
      },
    ],
    validator: (config) => {
      const errors: string[] = [];
      if (!Array.isArray(config.keywords) || config.keywords.length === 0) {
        errors.push('At least one keyword is required for keyword match trigger');
      }
      return { valid: errors.length === 0, errors };
    },
    executorRef: 'executor:trigger:keyword_match',
    isImplemented: true,
  },
  {
    type: 'INCOMING_CALL',
    category: 'triggers',
    label: 'Incoming Call',
    description: 'Triggers when a contact initiates a WhatsApp voice or video call.',
    icon: 'PhoneCall',
    color: TRIGGER_COLOR,
    inputs: [],
    outputs: DEFAULT_TRIGGER_OUTPUT,
    defaultConfig: {
      callType: 'ALL',
      autoReplyEnabled: true,
    },
    validator: () => ({ valid: true, errors: [] }),
    executorRef: 'executor:trigger:incoming_call',
    isImplemented: false,
    comingSoonNotice: 'WhatsApp Voice Call webhook ingestion is coming soon.',
  },
  {
    type: 'WEBHOOK',
    category: 'triggers',
    label: 'Webhook',
    description: 'Triggers when an external third-party service posts data to this automation webhook URL.',
    icon: 'Webhook',
    color: TRIGGER_COLOR,
    inputs: [],
    outputs: DEFAULT_TRIGGER_OUTPUT,
    defaultConfig: {
      method: 'POST',
      authRequired: true,
    },
    validator: () => ({ valid: true, errors: [] }),
    executorRef: 'executor:trigger:webhook',
    isImplemented: false,
    comingSoonNotice: 'Inbound external webhooks are coming in next release.',
  },
  {
    type: 'SCHEDULED_TRIGGER',
    category: 'triggers',
    label: 'Scheduled Trigger',
    description: 'Triggers periodically based on a cron expression or at a specified date and time.',
    icon: 'Calendar',
    color: TRIGGER_COLOR,
    inputs: [],
    outputs: DEFAULT_TRIGGER_OUTPUT,
    defaultConfig: {
      cron: '0 9 * * 1-5',
      timezone: 'UTC',
    },
    validator: () => ({ valid: true, errors: [] }),
    executorRef: 'executor:trigger:scheduled',
    isImplemented: true,
  },
  {
    type: 'CONVERSATION_CREATED',
    category: 'triggers',
    label: 'Conversation Created',
    description: 'Triggers when a new customer conversation thread is opened in the inbox.',
    icon: 'MessageSquarePlus',
    color: TRIGGER_COLOR,
    inputs: [],
    outputs: DEFAULT_TRIGGER_OUTPUT,
    defaultConfig: {
      channel: 'WHATSAPP',
    },
    validator: (config) => {
      const errors: string[] = [];
      if (config.channel && typeof config.channel !== 'string') {
        errors.push('Channel must be a string');
      }
      return { valid: errors.length === 0, errors };
    },
    executorRef: 'executor:trigger:conversation_created',
    isImplemented: true,
  },
  {
    type: 'CONTACT_CREATED',
    category: 'triggers',
    label: 'Contact Created',
    description: 'Triggers when a new contact record is created manually, imported, or via sync.',
    icon: 'UserPlus',
    color: TRIGGER_COLOR,
    inputs: [],
    outputs: DEFAULT_TRIGGER_OUTPUT,
    defaultConfig: {
      source: 'ANY',
    },
    validator: () => ({ valid: true, errors: [] }),
    executorRef: 'executor:trigger:contact_created',
    isImplemented: true,
  },
  {
    type: 'CUSTOMER_REPLIED',
    category: 'triggers',
    label: 'Customer Replied',
    description: 'Triggers when a customer sends a reply to an ongoing outbound conversation.',
    icon: 'CornerDownLeft',
    color: TRIGGER_COLOR,
    inputs: [],
    outputs: DEFAULT_TRIGGER_OUTPUT,
    defaultConfig: {
      withinHours: 24,
    },
    validator: (config) => {
      const errors: string[] = [];
      if (config.withinHours !== undefined && typeof config.withinHours !== 'number') {
        errors.push('withinHours must be a number');
      }
      return { valid: errors.length === 0, errors };
    },
    executorRef: 'executor:trigger:customer_replied',
    isImplemented: true,
  },
  {
    type: 'TAG_ADDED',
    category: 'triggers',
    label: 'Tag Added',
    description: 'Triggers when a specific tag is attached to a contact record.',
    icon: 'Tag',
    color: TRIGGER_COLOR,
    inputs: [],
    outputs: DEFAULT_TRIGGER_OUTPUT,
    defaultConfig: {
      tagName: '',
      matchAny: true,
    },
    configFields: [
      {
        name: 'tagName',
        label: 'Tag Name',
        type: 'string',
        placeholder: 'VIP, Lead, Inquirer...',
        description: 'Leave empty to trigger on any tag addition',
      },
    ],
    validator: () => ({ valid: true, errors: [] }),
    executorRef: 'executor:trigger:tag_added',
    isImplemented: true,
  },
];
