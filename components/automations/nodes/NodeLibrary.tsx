'use client';

import React, { useState, useMemo } from 'react';
import { Search, Plus, X, Lock } from 'lucide-react';
import {
  NodeDefinition,
  NodeCategory,
  getAllNodeDefinitions,
  getNodeDefinitionsByCategory,
} from '@/lib/automations/registry';
import { NodeIcon } from './NodeIcon';

interface NodeLibraryProps {
  onAddNode?: (definition: NodeDefinition) => void;
  className?: string;
  onCloseDrawer?: () => void;
}

const CATEGORIES: Array<{ id: string; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'triggers', label: 'Triggers' },
  { id: 'conditions', label: 'Conditions' },
  { id: 'actions', label: 'Actions' },
  { id: 'ai', label: 'AI' },
  { id: 'utilities', label: 'Utilities' },
];

export const NodeLibrary: React.FC<NodeLibraryProps> = ({
  onAddNode,
  className = '',
  onCloseDrawer,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const allDefinitions = useMemo(() => getAllNodeDefinitions(), []);

  // Filter definitions based on search query and category
  const filteredDefinitions = useMemo(() => {
    let list = allDefinitions;

    if (selectedCategory !== 'all') {
      list = getNodeDefinitionsByCategory(selectedCategory);
    }

    const trimmed = searchQuery.trim().toLowerCase();
    if (!trimmed) return list;

    return list.filter((def) => {
      return (
        def.label.toLowerCase().includes(trimmed) ||
        def.description.toLowerCase().includes(trimmed) ||
        def.type.toLowerCase().includes(trimmed)
      );
    });
  }, [allDefinitions, selectedCategory, searchQuery]);

  // Group definitions by category for structured display
  const groupedDefinitions = useMemo(() => {
    if (selectedCategory !== 'all') {
      return [{ category: selectedCategory, items: filteredDefinitions }];
    }

    const groups: Array<{ category: string; items: NodeDefinition[] }> = [];
    const categoryKeys: NodeCategory[] = ['triggers', 'conditions', 'actions', 'ai', 'utilities'];

    for (const cat of categoryKeys) {
      const items = filteredDefinitions.filter((d) => d.category === cat);
      if (items.length > 0) {
        groups.push({ category: cat, items });
      }
    }

    return groups;
  }, [filteredDefinitions, selectedCategory]);

  const handleDragStart = (e: React.DragEvent, def: NodeDefinition) => {
    if (!def.isImplemented) {
      e.preventDefault();
      return;
    }

    const dragPayload = {
      type: def.category === 'triggers' ? 'trigger' : def.category === 'conditions' ? 'condition' : 'action',
      definitionType: def.type,
      label: def.label,
      category: def.category,
      icon: def.icon,
      config: def.defaultConfig,
      outputs: def.outputs,
      inputs: def.inputs,
      isImplemented: def.isImplemented,
      executorRef: def.executorRef,
    };

    e.dataTransfer.setData('application/reactflow', JSON.stringify(dragPayload));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleNodeClick = (def: NodeDefinition) => {
    if (!def.isImplemented) return;
    if (onAddNode) {
      onAddNode(def);
    }
    if (onCloseDrawer) {
      onCloseDrawer();
    }
  };

  const getCategoryTitle = (cat: string) => {
    switch (cat.toLowerCase()) {
      case 'triggers':
        return 'Triggers';
      case 'conditions':
        return 'Conditions';
      case 'actions':
        return 'Actions';
      case 'ai':
        return 'AI Automation';
      case 'utilities':
        return 'Utilities';
      default:
        return cat;
    }
  };

  return (
    <div className={`flex flex-col h-full bg-white ${className}`}>
      {/* Panel Header */}
      <div className="p-3.5 border-b border-gray-100 space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5 text-emerald-600" />
            <span>Add Node</span>
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400 font-semibold">
              {filteredDefinitions.length} / {allDefinitions.length} nodes
            </span>
            {onCloseDrawer && (
              <button
                onClick={onCloseDrawer}
                className="p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 lg:hidden"
                aria-label="Close panel"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search triggers, actions, AI..."
            className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl border border-gray-200 bg-gray-50/70 text-gray-900 placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px] font-medium no-scrollbar">
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-2 py-0.5 rounded-lg whitespace-nowrap transition cursor-pointer ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 shadow-2xs'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Node Items List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {groupedDefinitions.length === 0 ? (
          <div className="text-center py-10 px-4">
            <p className="text-xs text-gray-500 font-medium">No nodes match your search</p>
            <p className="text-[11px] text-gray-400 mt-1">
              Try searching with a different keyword or category filter.
            </p>
          </div>
        ) : (
          groupedDefinitions.map((group) => (
            <div key={group.category} className="space-y-2">
              {selectedCategory === 'all' && (
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    {getCategoryTitle(group.category)}
                  </span>
                  <span className="text-[10px] font-medium text-gray-400">
                    {group.items.length}
                  </span>
                </div>
              )}

              <div className="space-y-1.5">
                {group.items.map((def) => {
                  const isAvailable = def.isImplemented;

                  return (
                    <div
                      key={def.type}
                      data-testid={`node-card-${def.type}`}
                      draggable={isAvailable}
                      onDragStart={(e) => handleDragStart(e, def)}
                      onClick={() => handleNodeClick(def)}
                      className={`p-2.5 rounded-xl border transition-all select-none ${
                        isAvailable
                          ? 'bg-white border-gray-200/80 hover:border-emerald-500 hover:shadow-xs cursor-pointer active:cursor-grabbing group'
                          : 'bg-gray-50/60 border-gray-200/50 opacity-60 cursor-not-allowed'
                      }`}
                      title={
                        isAvailable
                          ? `Drag or click to add ${def.label}`
                          : def.comingSoonNotice || 'Coming soon in future update'
                      }
                    >
                      <div className="flex items-start gap-2.5">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition ${
                            isAvailable
                              ? `${def.color.bg} ${def.color.text} group-hover:scale-105`
                              : 'bg-gray-200 text-gray-400'
                          }`}
                        >
                          <NodeIcon name={def.icon} className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <h3 className="text-xs font-semibold text-gray-900 truncate">
                              {def.label}
                            </h3>
                            {!isAvailable && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-gray-200 text-gray-600 uppercase flex items-center gap-0.5">
                                <Lock className="w-2.5 h-2.5" />
                                <span>Soon</span>
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-gray-500 leading-snug line-clamp-2 mt-0.5">
                            {def.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
