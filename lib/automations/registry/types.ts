/**
 * Automation Node Registry — Types & Interfaces
 *
 * Central data contracts for workflow nodes across triggers, conditions,
 * actions, AI, and utilities.
 */

export type NodeCategory = 'triggers' | 'conditions' | 'actions' | 'ai' | 'utilities';

export interface NodeOutput {
  id: string;
  label: string;
  description?: string;
  badgeColor?: string;
}

export type InputContextType = 'contact' | 'conversation' | 'message' | 'workspace';

export interface NodeInputRequirement {
  context: InputContextType;
  required: boolean;
  description?: string;
}

export interface ConfigFieldSchema {
  name: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'textarea' | 'json' | 'tags';
  description?: string;
  required?: boolean;
  defaultValue?: any;
  options?: Array<{ label: string; value: string }>;
  placeholder?: string;
}

export interface NodeValidationResult {
  valid: boolean;
  errors: string[];
}

export interface NodeDefinition {
  type: string;
  category: NodeCategory;
  label: string;
  description: string;
  icon: string; // Lucide icon name, e.g. 'MessageSquare', 'Filter', etc.
  color: {
    bg: string;
    text: string;
    border: string;
    gradient: string;
  };
  inputs: NodeInputRequirement[];
  outputs: NodeOutput[];
  defaultConfig: Record<string, any>;
  configFields?: ConfigFieldSchema[];
  validator: (config: Record<string, any>) => NodeValidationResult;
  executorRef: string;
  isImplemented: boolean;
  comingSoonNotice?: string;
}
