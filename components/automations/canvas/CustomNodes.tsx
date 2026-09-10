'use client';

import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import {
  MessageSquare,
  Filter,
  Send,
  Bot,
  Clock,
  Copy,
  Trash2,
} from 'lucide-react';
import { NodeIcon } from '@/components/automations/nodes/NodeIcon';
import type { WorkflowNode } from './workflowTypes';

// ── Node Category Styling Config ────────────────────────────────────────────

interface CategoryTheme {
  border: string;
  selectedBorder: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  iconBg: string;
  iconText: string;
  accentHandle: string;
  defaultIcon: React.ElementType;
}

const THEMES: Record<string, CategoryTheme> = {
  trigger: {
    border: 'border-emerald-200 hover:border-emerald-300',
    selectedBorder: 'border-emerald-500 ring-2 ring-emerald-500/25',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-700',
    badgeBorder: 'border-emerald-200',
    iconBg: 'bg-emerald-50',
    iconText: 'text-emerald-600',
    accentHandle: '!bg-emerald-500',
    defaultIcon: MessageSquare,
  },
  condition: {
    border: 'border-amber-200 hover:border-amber-300',
    selectedBorder: 'border-amber-500 ring-2 ring-amber-500/25',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-700',
    badgeBorder: 'border-amber-200',
    iconBg: 'bg-amber-50',
    iconText: 'text-amber-600',
    accentHandle: '!bg-amber-500',
    defaultIcon: Filter,
  },
  action: {
    border: 'border-blue-200 hover:border-blue-300',
    selectedBorder: 'border-blue-500 ring-2 ring-blue-500/25',
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-700',
    badgeBorder: 'border-blue-200',
    iconBg: 'bg-blue-50',
    iconText: 'text-blue-600',
    accentHandle: '!bg-blue-500',
    defaultIcon: Send,
  },
  ai: {
    border: 'border-purple-200 hover:border-purple-300',
    selectedBorder: 'border-purple-500 ring-2 ring-purple-500/25',
    badgeBg: 'bg-purple-50',
    badgeText: 'text-purple-700',
    badgeBorder: 'border-purple-200',
    iconBg: 'bg-purple-50',
    iconText: 'text-purple-600',
    accentHandle: '!bg-purple-500',
    defaultIcon: Bot,
  },
  utility: {
    border: 'border-slate-200 hover:border-slate-300',
    selectedBorder: 'border-slate-500 ring-2 ring-slate-500/25',
    badgeBg: 'bg-slate-100',
    badgeText: 'text-slate-700',
    badgeBorder: 'border-slate-200',
    iconBg: 'bg-slate-100',
    iconText: 'text-slate-600',
    accentHandle: '!bg-slate-500',
    defaultIcon: Clock,
  },
};

// ── Shared Base Node Card ───────────────────────────────────────────────────

interface BaseNodeCardProps {
  id: string;
  selected?: boolean;
  type: string;
  label: string;
  nodeKey: string;
  category: string;
  iconName?: string;
  onDuplicate?: (id: string) => void;
  onDelete?: (id: string) => void;
  children?: React.ReactNode;
}

const BaseNodeCard: React.FC<BaseNodeCardProps> = ({
  id,
  selected,
  type,
  label,
  nodeKey,
  category,
  iconName,
  onDuplicate,
  onDelete,
  children,
}) => {
  const theme = THEMES[type] || THEMES.action;
  const DefaultIconComponent = theme.defaultIcon;

  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDuplicate) onDuplicate(id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) onDelete(id);
  };

  return (
    <div
      data-testid={`workflow-node-${id}`}
      data-node-id={id}
      className={`relative w-64 rounded-2xl bg-white border p-3 shadow-sm transition-all duration-150 ${
        selected ? theme.selectedBorder : theme.border
      }`}
    >
      {/* Top row: Icon, Category Pill, Actions */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 ${theme.iconBg} ${theme.iconText}`}
          >
            {iconName ? (
              <NodeIcon name={iconName} className="w-4 h-4" />
            ) : (
              <DefaultIconComponent className="w-4 h-4" />
            )}
          </div>
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${theme.badgeBg} ${theme.badgeText} ${theme.badgeBorder}`}
          >
            {category || type}
          </span>
        </div>

        {/* Action icons: Duplicate & Delete */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleDuplicate}
            aria-label="Duplicate Node"
            title="Duplicate Node"
            className="p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
          >
            <Copy className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={handleDelete}
            aria-label="Delete Node"
            title="Delete Node"
            className="p-1 rounded-md text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Label and Key */}
      <div className="space-y-0.5 min-w-0">
        <h4 className="text-xs font-bold text-gray-900 truncate" title={label}>
          {label}
        </h4>
        <p className="text-[10px] font-mono text-gray-400 truncate" title={nodeKey}>
          {nodeKey}
        </p>
      </div>

      {children}
    </div>
  );
};

// ── 1. Trigger Node ─────────────────────────────────────────────────────────

export const TriggerNode = memo((props: NodeProps<WorkflowNode>) => {
  const { id, data, selected } = props;
  const theme = THEMES.trigger;

  return (
    <div className="relative">
      <BaseNodeCard
        id={id}
        selected={selected}
        type="trigger"
        label={data.label}
        nodeKey={data.nodeKey}
        category={data.category || 'Triggers'}
        iconName={data.icon || data.iconName}
        onDuplicate={data.onDuplicate}
        onDelete={data.onDelete}
      />
      {/* Bottom Source Handle Only */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="output"
        className={`!w-3 !h-3 !border-2 !border-white ${theme.accentHandle} !bottom-[-6px] shadow-xs cursor-crosshair`}
      />
    </div>
  );
});
TriggerNode.displayName = 'TriggerNode';

// ── 2. Condition Node ───────────────────────────────────────────────────────

export const ConditionNode = memo((props: NodeProps<WorkflowNode>) => {
  const { id, data, selected } = props;

  // Support dynamic outputs from registry or fallback to standard YES / NO
  const outputs = Array.isArray(data.outputs) && data.outputs.length >= 2
    ? data.outputs
    : [
        { id: 'yes', label: 'YES' },
        { id: 'no', label: 'NO' },
      ];

  const firstBranch = outputs[0];
  const secondBranch = outputs[1];

  return (
    <div className="relative">
      {/* Top Target Handle */}
      <Handle
        type="target"
        position={Position.Top}
        id="input"
        className="!w-3 !h-3 !border-2 !border-white !bg-gray-400 !top-[-6px] shadow-xs cursor-crosshair"
      />

      <BaseNodeCard
        id={id}
        selected={selected}
        type="condition"
        label={data.label}
        nodeKey={data.nodeKey}
        category={data.category || 'Conditions'}
        iconName={data.icon || data.iconName}
        onDuplicate={data.onDuplicate}
        onDelete={data.onDelete}
      >
        {/* Branch Labels Footer */}
        <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between text-[10px] font-bold">
          <div className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            <span>{firstBranch.label}</span>
          </div>
          <div className="flex items-center gap-1 text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
            <span>{secondBranch.label}</span>
          </div>
        </div>
      </BaseNodeCard>

      {/* Bottom Source Handles */}
      <Handle
        type="source"
        position={Position.Bottom}
        id={firstBranch.id}
        style={{ left: '30%' }}
        className="!w-3 !h-3 !border-2 !border-white !bg-emerald-500 !bottom-[-6px] shadow-xs cursor-crosshair"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id={secondBranch.id}
        style={{ left: '70%' }}
        className="!w-3 !h-3 !border-2 !border-white !bg-rose-500 !bottom-[-6px] shadow-xs cursor-crosshair"
      />
    </div>
  );
});
ConditionNode.displayName = 'ConditionNode';

// ── 3. Action Node ──────────────────────────────────────────────────────────

export const ActionNode = memo((props: NodeProps<WorkflowNode>) => {
  const { id, data, selected } = props;
  const theme = THEMES.action;

  return (
    <div className="relative">
      <Handle
        type="target"
        position={Position.Top}
        id="input"
        className="!w-3 !h-3 !border-2 !border-white !bg-gray-400 !top-[-6px] shadow-xs cursor-crosshair"
      />

      <BaseNodeCard
        id={id}
        selected={selected}
        type="action"
        label={data.label}
        nodeKey={data.nodeKey}
        category={data.category || 'Actions'}
        iconName={data.icon || data.iconName}
        onDuplicate={data.onDuplicate}
        onDelete={data.onDelete}
      />

      <Handle
        type="source"
        position={Position.Bottom}
        id="output"
        className={`!w-3 !h-3 !border-2 !border-white ${theme.accentHandle} !bottom-[-6px] shadow-xs cursor-crosshair`}
      />
    </div>
  );
});
ActionNode.displayName = 'ActionNode';

// ── 4. AI Node ──────────────────────────────────────────────────────────────

export const AINode = memo((props: NodeProps<WorkflowNode>) => {
  const { id, data, selected } = props;
  const theme = THEMES.ai;

  return (
    <div className="relative">
      <Handle
        type="target"
        position={Position.Top}
        id="input"
        className="!w-3 !h-3 !border-2 !border-white !bg-gray-400 !top-[-6px] shadow-xs cursor-crosshair"
      />

      <BaseNodeCard
        id={id}
        selected={selected}
        type="ai"
        label={data.label}
        nodeKey={data.nodeKey}
        category={data.category || 'AI'}
        iconName={data.icon || data.iconName}
        onDuplicate={data.onDuplicate}
        onDelete={data.onDelete}
      />

      <Handle
        type="source"
        position={Position.Bottom}
        id="output"
        className={`!w-3 !h-3 !border-2 !border-white ${theme.accentHandle} !bottom-[-6px] shadow-xs cursor-crosshair`}
      />
    </div>
  );
});
AINode.displayName = 'AINode';

// ── 5. Utility Node ─────────────────────────────────────────────────────────

export const UtilityNode = memo((props: NodeProps<WorkflowNode>) => {
  const { id, data, selected } = props;
  const theme = THEMES.utility;

  return (
    <div className="relative">
      <Handle
        type="target"
        position={Position.Top}
        id="input"
        className="!w-3 !h-3 !border-2 !border-white !bg-gray-400 !top-[-6px] shadow-xs cursor-crosshair"
      />

      <BaseNodeCard
        id={id}
        selected={selected}
        type="utility"
        label={data.label}
        nodeKey={data.nodeKey}
        category={data.category || 'Utilities'}
        iconName={data.icon || data.iconName}
        onDuplicate={data.onDuplicate}
        onDelete={data.onDelete}
      />

      <Handle
        type="source"
        position={Position.Bottom}
        id="output"
        className={`!w-3 !h-3 !border-2 !border-white ${theme.accentHandle} !bottom-[-6px] shadow-xs cursor-crosshair`}
      />
    </div>
  );
});
UtilityNode.displayName = 'UtilityNode';

// ── Node Types Registry ─────────────────────────────────────────────────────

export const WORKFLOW_NODE_TYPES = {
  trigger: TriggerNode,
  condition: ConditionNode,
  action: ActionNode,
  ai: AINode,
  utility: UtilityNode,
};
