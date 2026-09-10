import { NodeDefinition, NodeCategory, NodeValidationResult } from './types';
import { TRIGGER_DEFINITIONS } from './definitions/triggers';
import { CONDITION_DEFINITIONS } from './definitions/conditions';
import { ACTION_DEFINITIONS } from './definitions/actions';
import { AI_DEFINITIONS } from './definitions/ai';
import { UTILITY_DEFINITIONS } from './definitions/utilities';

/**
 * All 35 node definitions registered in the Wazzi Automation system.
 */
export const ALL_NODE_DEFINITIONS: NodeDefinition[] = [
  ...TRIGGER_DEFINITIONS,
  ...CONDITION_DEFINITIONS,
  ...ACTION_DEFINITIONS,
  ...AI_DEFINITIONS,
  ...UTILITY_DEFINITIONS,
];

// Map lookup by upper-cased type string
const NODE_DEFINITION_MAP = new Map<string, NodeDefinition>();
for (const def of ALL_NODE_DEFINITIONS) {
  NODE_DEFINITION_MAP.set(def.type.toUpperCase(), def);
  // Also index lowercase version for flexible lookup
  NODE_DEFINITION_MAP.set(def.type.toLowerCase(), def);
}

/**
 * Retrieve a node definition by its unique type key.
 */
export function getNodeDefinition(type: string): NodeDefinition | undefined {
  if (!type) return undefined;
  return NODE_DEFINITION_MAP.get(type) || NODE_DEFINITION_MAP.get(type.toUpperCase()) || NODE_DEFINITION_MAP.get(type.toLowerCase());
}

/**
 * Retrieve all registered node definitions.
 */
export function getAllNodeDefinitions(): NodeDefinition[] {
  return [...ALL_NODE_DEFINITIONS];
}

/**
 * Retrieve node definitions filtered by category.
 */
export function getNodeDefinitionsByCategory(category: NodeCategory | string): NodeDefinition[] {
  const normCategory = category.toLowerCase().trim();
  if (normCategory === 'all') return getAllNodeDefinitions();

  return ALL_NODE_DEFINITIONS.filter((def) => {
    // Check exact match or plural/singular variants (e.g. 'triggers' vs 'trigger')
    return (
      def.category.toLowerCase() === normCategory ||
      `${def.category.toLowerCase()}s` === normCategory ||
      def.category.toLowerCase() === `${normCategory}s`
    );
  });
}

/**
 * Search node definitions by keyword across label, description, and type.
 */
export function searchNodeDefinitions(query: string, category?: string): NodeDefinition[] {
  let list = ALL_NODE_DEFINITIONS;

  if (category && category.toLowerCase() !== 'all') {
    list = getNodeDefinitionsByCategory(category);
  }

  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return list;

  return list.filter((def) => {
    return (
      def.label.toLowerCase().includes(trimmed) ||
      def.description.toLowerCase().includes(trimmed) ||
      def.type.toLowerCase().includes(trimmed)
    );
  });
}

/**
 * Validate configuration data for a specific node type using its registered validator.
 */
export function validateNodeConfig(type: string, config: Record<string, any>): NodeValidationResult {
  const definition = getNodeDefinition(type);
  if (!definition) {
    return {
      valid: false,
      errors: [`Unknown node type: ${type}`],
    };
  }

  return definition.validator(config || {});
}

/**
 * Generate default node data payload from a NodeDefinition.
 */
export function createDefaultNodeData(
  definition: NodeDefinition,
  nodeKey?: string
): {
  definitionType: string;
  nodeType: string;
  nodeKey: string;
  label: string;
  category: string;
  icon: string;
  config: Record<string, any>;
  outputs: Array<{ id: string; label: string; badgeColor?: string }>;
  inputs: Array<{ context: string; required: boolean }>;
  isImplemented: boolean;
  comingSoonNotice?: string;
  executorRef: string;
} {
  return {
    definitionType: definition.type,
    nodeType: definition.category === 'triggers' ? 'trigger' : definition.category === 'conditions' ? 'condition' : 'action',
    nodeKey: nodeKey || definition.type.toLowerCase(),
    label: definition.label,
    category: definition.category,
    icon: definition.icon,
    config: JSON.parse(JSON.stringify(definition.defaultConfig)),
    outputs: JSON.parse(JSON.stringify(definition.outputs)),
    inputs: JSON.parse(JSON.stringify(definition.inputs)),
    isImplemented: definition.isImplemented,
    comingSoonNotice: definition.comingSoonNotice,
    executorRef: definition.executorRef,
  };
}
