import { NodeDefinition } from '../types';

const ACTION_COLOR = {
  bg: 'bg-purple-50',
  text: 'text-purple-700',
  border: 'border-purple-200',
  gradient: 'from-purple-500 to-indigo-600',
};

const DEFAULT_ACTION_OUTPUT = [
  {
    id: 'default',
    label: 'NEXT',
    description: 'Continues execution to following node upon completion',
    badgeColor: 'bg-purple-100 text-purple-800',
  },
];

export const ACTION_DEFINITIONS: NodeDefinition[] = [
  {
    type: 'SEND_WHATSAPP_MESSAGE',
    category: 'actions',
    label: 'Send WhatsApp Message',
    description: 'Sends a direct custom text message to the contact through connected WhatsApp number.',
    icon: 'Send',
    color: ACTION_COLOR,
    inputs: [
      {
        context: 'contact',
        required: true,
        description: 'Requires target contact phone number.',
      },
      {
        context: 'conversation',
        required: true,
        description: 'Requires active conversation context.',
      },
    ],
    outputs: DEFAULT_ACTION_OUTPUT,
    defaultConfig: {
      messageText: '',
      previewUrl: false,
    },
    configFields: [
      {
        name: 'messageText',
        label: 'Message Text',
        type: 'textarea',
        required: true,
        placeholder: 'Hello {{contact.name}}, thanks for reaching out...',
        description: 'You can use dynamic variables like {{contact.name}} or {{contact.phone}}',
      },
      {
        name: 'previewUrl',
        label: 'Include Link Previews',
        type: 'boolean',
        defaultValue: false,
      },
    ],
    validator: (config) => {
      const errors: string[] = [];
      if (!config.messageText || typeof config.messageText !== 'string' || !config.messageText.trim()) {
        errors.push('Message text cannot be empty');
      }
      return { valid: errors.length === 0, errors };
    },
    executorRef: 'executor:action:send_whatsapp_message',
    isImplemented: true,
  },
  {
    type: 'SEND_WHATSAPP_TEMPLATE',
    category: 'actions',
    label: 'Send WhatsApp Template',
    description: 'Sends a pre-approved Meta WhatsApp Message Template to bypass 24h messaging window.',
    icon: 'FileText',
    color: ACTION_COLOR,
    inputs: [
      {
        context: 'contact',
        required: true,
        description: 'Requires target contact recipient phone.',
      },
    ],
    outputs: DEFAULT_ACTION_OUTPUT,
    defaultConfig: {
      templateName: '',
      languageCode: 'en_US',
      parameters: {},
    },
    configFields: [
      {
        name: 'templateName',
        label: 'Template Name',
        type: 'string',
        required: true,
        placeholder: 'welcome_lead_v1',
      },
      {
        name: 'languageCode',
        label: 'Language',
        type: 'string',
        defaultValue: 'en_US',
      },
    ],
    validator: (config) => {
      const errors: string[] = [];
      if (!config.templateName || !config.templateName.trim()) {
        errors.push('Template name is required');
      }
      return { valid: errors.length === 0, errors };
    },
    executorRef: 'executor:action:send_whatsapp_template',
    isImplemented: true,
  },
  {
    type: 'SEND_MEDIA',
    category: 'actions',
    label: 'Send Media',
    description: 'Sends an image, PDF document, video, or audio file to the contact.',
    icon: 'Image',
    color: ACTION_COLOR,
    inputs: [
      { context: 'contact', required: true },
      { context: 'conversation', required: true },
    ],
    outputs: DEFAULT_ACTION_OUTPUT,
    defaultConfig: {
      mediaType: 'image', // 'image' | 'document' | 'video' | 'audio'
      mediaUrl: '',
      caption: '',
    },
    validator: (config) => {
      const errors: string[] = [];
      if (!config.mediaUrl || !config.mediaUrl.trim()) {
        errors.push('Media URL is required');
      }
      return { valid: errors.length === 0, errors };
    },
    executorRef: 'executor:action:send_media',
    isImplemented: true,
  },
  {
    type: 'ASSIGN_AGENT',
    category: 'actions',
    label: 'Assign to Agent',
    description: 'Assigns the conversation to a specific human agent or routes via round-robin.',
    icon: 'UserCheck',
    color: ACTION_COLOR,
    inputs: [{ context: 'conversation', required: true }],
    outputs: DEFAULT_ACTION_OUTPUT,
    defaultConfig: {
      assignmentType: 'ROUND_ROBIN', // 'ROUND_ROBIN' | 'SPECIFIC_AGENT'
      agentUserId: null,
    },
    validator: () => ({ valid: true, errors: [] }),
    executorRef: 'executor:action:assign_agent',
    isImplemented: true,
  },
  {
    type: 'ADD_TAG',
    category: 'actions',
    label: 'Add Tag',
    description: 'Attaches one or more tags to the contact profile for segmentation and reporting.',
    icon: 'Tag',
    color: ACTION_COLOR,
    inputs: [{ context: 'contact', required: true }],
    outputs: DEFAULT_ACTION_OUTPUT,
    defaultConfig: {
      tags: ['Automated'],
    },
    configFields: [
      {
        name: 'tags',
        label: 'Tags to add',
        type: 'tags',
        defaultValue: ['Automated'],
        placeholder: 'Enter tag names',
      },
    ],
    validator: (config) => {
      const errors: string[] = [];
      if (!Array.isArray(config.tags) || config.tags.length === 0) {
        errors.push('At least one tag name must be provided');
      }
      return { valid: errors.length === 0, errors };
    },
    executorRef: 'executor:action:add_tag',
    isImplemented: true,
  },
  {
    type: 'REMOVE_TAG',
    category: 'actions',
    label: 'Remove Tag',
    description: 'Removes designated tags from the contact record.',
    icon: 'Tag',
    color: ACTION_COLOR,
    inputs: [{ context: 'contact', required: true }],
    outputs: DEFAULT_ACTION_OUTPUT,
    defaultConfig: {
      tags: [],
    },
    validator: (config) => {
      const errors: string[] = [];
      if (!Array.isArray(config.tags) || config.tags.length === 0) {
        errors.push('At least one tag must be specified for removal');
      }
      return { valid: errors.length === 0, errors };
    },
    executorRef: 'executor:action:remove_tag',
    isImplemented: true,
  },
  {
    type: 'UPDATE_CONTACT',
    category: 'actions',
    label: 'Update Contact',
    description: 'Updates fields on the contact record (e.g. name, email, or custom metadata).',
    icon: 'UserCog',
    color: ACTION_COLOR,
    inputs: [{ context: 'contact', required: true }],
    outputs: DEFAULT_ACTION_OUTPUT,
    defaultConfig: {
      fields: {},
    },
    validator: () => ({ valid: true, errors: [] }),
    executorRef: 'executor:action:update_contact',
    isImplemented: true,
  },
  {
    type: 'CREATE_TASK',
    category: 'actions',
    label: 'Create CRM Task',
    description: 'Creates a scheduled task or follow-up reminder in the CRM team calendar.',
    icon: 'CheckSquare',
    color: ACTION_COLOR,
    inputs: [{ context: 'contact', required: true }],
    outputs: DEFAULT_ACTION_OUTPUT,
    defaultConfig: {
      taskTitle: 'Follow up with lead',
      dueInHours: 24,
    },
    validator: () => ({ valid: true, errors: [] }),
    executorRef: 'executor:action:create_task',
    isImplemented: true,
  },
  {
    type: 'SEND_EMAIL',
    category: 'actions',
    label: 'Send Email',
    description: 'Sends an email notification or report to an external address or team inbox.',
    icon: 'Mail',
    color: ACTION_COLOR,
    inputs: [],
    outputs: DEFAULT_ACTION_OUTPUT,
    defaultConfig: {
      toAddress: '',
      subject: '',
      body: '',
    },
    validator: () => ({ valid: true, errors: [] }),
    executorRef: 'executor:action:send_email',
    isImplemented: false,
    comingSoonNotice: 'Email delivery action is coming soon.',
  },
  {
    type: 'SEND_INTERNAL_NOTE',
    category: 'actions',
    label: 'Send Internal Note',
    description: 'Leaves a private internal note visible only to teammates on the conversation thread.',
    icon: 'MessageSquareQuote',
    color: ACTION_COLOR,
    inputs: [{ context: 'conversation', required: true }],
    outputs: DEFAULT_ACTION_OUTPUT,
    defaultConfig: {
      noteContent: '',
    },
    validator: (config) => {
      const errors: string[] = [];
      if (!config.noteContent || !config.noteContent.trim()) {
        errors.push('Internal note content is required');
      }
      return { valid: errors.length === 0, errors };
    },
    executorRef: 'executor:action:send_internal_note',
    isImplemented: true,
  },
  {
    type: 'CHANGE_CONVERSATION_STATUS',
    category: 'actions',
    label: 'Change Conversation Status',
    description: 'Updates conversation workflow status (e.g. mark RESOLVED or PENDING).',
    icon: 'CheckCircle2',
    color: ACTION_COLOR,
    inputs: [{ context: 'conversation', required: true }],
    outputs: DEFAULT_ACTION_OUTPUT,
    defaultConfig: {
      newStatus: 'RESOLVED',
    },
    configFields: [
      {
        name: 'newStatus',
        label: 'New Status',
        type: 'select',
        defaultValue: 'RESOLVED',
        options: [
          { label: 'Resolved', value: 'RESOLVED' },
          { label: 'Closed', value: 'CLOSED' },
          { label: 'Open', value: 'OPEN' },
          { label: 'Pending', value: 'PENDING' },
        ],
      },
    ],
    validator: (config) => {
      const errors: string[] = [];
      if (!config.newStatus) {
        errors.push('Target conversation status is required');
      }
      return { valid: errors.length === 0, errors };
    },
    executorRef: 'executor:action:change_conversation_status',
    isImplemented: true,
  },
];
