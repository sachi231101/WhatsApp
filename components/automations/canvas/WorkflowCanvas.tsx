'use client';

import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  Background,
  BackgroundVariant,
  applyNodeChanges,
  applyEdgeChanges,
  type Connection,
  type EdgeChange,
  type NodeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Grid,
  Undo2,
  Redo2,
  Workflow,
  Plus,
} from 'lucide-react';

import { WORKFLOW_NODE_TYPES } from './CustomNodes';
import { WORKFLOW_EDGE_TYPES } from './CustomEdge';
import {
  type WorkflowNode,
  type WorkflowEdge,
  type WorkflowNodeData,
  duplicateWorkflowNode,
  validateConnectionRule,
  generateUniqueNodeKey,
} from './workflowTypes';

export interface WorkflowCanvasHandle {
  addNodeFromCatalogue: (item: {
    type?: string;
    definitionType?: string;
    label?: string;
    category?: any;
    icon?: string;
    iconName?: string;
    config?: Record<string, any>;
    defaultConfig?: Record<string, any>;
    outputs?: any[];
    inputs?: any[];
    isImplemented?: boolean;
    executorRef?: string;
    [key: string]: any;
  }) => void;
  updateSelectedNodeData: (nodeId: string, updates: Partial<WorkflowNodeData>) => void;
  undo: () => void;
  redo: () => void;
  fitView: () => void;
  getGraph: () => { nodes: WorkflowNode[]; edges: WorkflowEdge[] };
}

interface WorkflowCanvasProps {
  initialNodes?: WorkflowNode[];
  initialEdges?: WorkflowEdge[];
  selectedNodeId?: string | null;
  onSelectNode: (node: WorkflowNode | null) => void;
  onChange?: (graph: { nodes: WorkflowNode[]; edges: WorkflowEdge[] }) => void;
  onOpenCatalogue?: () => void;
}

// ── Inner Canvas Component with useReactFlow ────────────────────────────────

const CanvasInner = forwardRef<WorkflowCanvasHandle, WorkflowCanvasProps>(
  (
    {
      initialNodes = [],
      initialEdges = [],
      selectedNodeId,
      onSelectNode,
      onChange,
      onOpenCatalogue,
    },
    ref
  ) => {
    const { fitView, zoomIn, zoomOut, getZoom, screenToFlowPosition } = useReactFlow();

    // ── Graph State ─────────────────────────────────────────────────────────
    const [nodes, setNodes] = useState<WorkflowNode[]>(() => initialNodes);
    const [edges, setEdges] = useState<WorkflowEdge[]>(() => initialEdges);
    const [showGrid, setShowGrid] = useState<boolean>(true);
    const [zoomLevel, setZoomLevel] = useState<number>(100);

    // ── Undo / Redo History Stack ───────────────────────────────────────────
    const [history, setHistory] = useState<{
      past: Array<{ nodes: WorkflowNode[]; edges: WorkflowEdge[] }>;
      future: Array<{ nodes: WorkflowNode[]; edges: WorkflowEdge[] }>;
    }>({
      past: [],
      future: [],
    });

    // Keep ref for current graph to avoid stale closure issues
    const graphRef = useRef({ nodes, edges });
    useEffect(() => {
      graphRef.current = { nodes, edges };
      if (onChange) {
        onChange({ nodes, edges });
      }
    }, [nodes, edges, onChange]);

    // Push state snapshot into undo history
    const pushSnapshot = useCallback(() => {
      setHistory((prev) => ({
        past: [
          ...prev.past.slice(-25), // retain last 25 operations
          {
            nodes: JSON.parse(JSON.stringify(graphRef.current.nodes)),
            edges: JSON.parse(JSON.stringify(graphRef.current.edges)),
          },
        ],
        future: [],
      }));
    }, []);

    // ── Undo Action ─────────────────────────────────────────────────────────
    const handleUndo = useCallback(() => {
      setHistory((prev) => {
        if (prev.past.length === 0) return prev;
        const previous = prev.past[prev.past.length - 1];
        const newPast = prev.past.slice(0, prev.past.length - 1);

        const currentSnapshot = {
          nodes: JSON.parse(JSON.stringify(graphRef.current.nodes)),
          edges: JSON.parse(JSON.stringify(graphRef.current.edges)),
        };

        // Restore previous graph
        setNodes(previous.nodes);
        setEdges(previous.edges);

        return {
          past: newPast,
          future: [currentSnapshot, ...prev.future],
        };
      });
    }, []);

    // ── Redo Action ─────────────────────────────────────────────────────────
    const handleRedo = useCallback(() => {
      setHistory((prev) => {
        if (prev.future.length === 0) return prev;
        const next = prev.future[0];
        const newFuture = prev.future.slice(1);

        const currentSnapshot = {
          nodes: JSON.parse(JSON.stringify(graphRef.current.nodes)),
          edges: JSON.parse(JSON.stringify(graphRef.current.edges)),
        };

        // Apply next graph
        setNodes(next.nodes);
        setEdges(next.edges);

        return {
          past: [...prev.past, currentSnapshot],
          future: newFuture,
        };
      });
    }, []);

    // ── Node Actions: Delete & Duplicate ────────────────────────────────────

    const handleDeleteNode = useCallback(
      (nodeId: string) => {
        pushSnapshot();
        setNodes((prevNodes) => prevNodes.filter((n) => n.id !== nodeId));
        setEdges((prevEdges) =>
          prevEdges.filter((e) => e.source !== nodeId && e.target !== nodeId)
        );
        if (selectedNodeId === nodeId) {
          onSelectNode(null);
        }
      },
      [pushSnapshot, selectedNodeId, onSelectNode]
    );

    const handleDuplicateNode = useCallback(
      (nodeId: string) => {
        const sourceNode = graphRef.current.nodes.find((n) => n.id === nodeId);
        if (!sourceNode) return;

        pushSnapshot();
        const duplicated = duplicateWorkflowNode(sourceNode, graphRef.current.nodes, {
          onDuplicate: handleDuplicateNode,
          onDelete: handleDeleteNode,
        });

        setNodes((prevNodes) => [
          ...prevNodes.map((n) => ({ ...n, selected: false })),
          duplicated,
        ]);
        onSelectNode(duplicated);
      },
      [pushSnapshot, handleDeleteNode, onSelectNode]
    );

    // Bind handlers into nodes whenever nodes list changes
    const enhancedNodes = useMemo(() => {
      return nodes.map((node) => ({
        ...node,
        selected: node.id === selectedNodeId,
        data: {
          ...node.data,
          onDuplicate: handleDuplicateNode,
          onDelete: handleDeleteNode,
        },
      }));
    }, [nodes, selectedNodeId, handleDuplicateNode, handleDeleteNode]);

    // ── React Flow Event Handlers ───────────────────────────────────────────

    const handleNodesChange = useCallback(
      (changes: NodeChange<WorkflowNode>[]) => {
        setNodes((nds) => applyNodeChanges(changes, nds));
      },
      []
    );

    const handleEdgesChange = useCallback(
      (changes: EdgeChange<WorkflowEdge>[]) => {
        setEdges((eds) => applyEdgeChanges(changes, eds));
      },
      []
    );

    const handleNodeDragStart = useCallback(() => {
      pushSnapshot();
    }, [pushSnapshot]);

    const handleConnect = useCallback(
      (connection: Connection) => {
        const validation = validateConnectionRule(
          connection,
          graphRef.current.nodes,
          graphRef.current.edges
        );

        if (!validation.isValid) {
          return;
        }

        pushSnapshot();

        // Determine branch value if condition node
        let conditionKey: string | null = null;
        if (connection.sourceHandle) {
          if (connection.sourceHandle.toLowerCase() === 'yes') conditionKey = 'YES';
          if (connection.sourceHandle.toLowerCase() === 'no') conditionKey = 'NO';
        }

        const newEdge: WorkflowEdge = {
          id: `edge_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          source: connection.source!,
          target: connection.target!,
          sourceHandle: connection.sourceHandle || null,
          targetHandle: connection.targetHandle || null,
          type: 'branchingEdge',
          data: { conditionKey },
        };

        setEdges((eds) => [...eds, newEdge]);
      },
      [pushSnapshot]
    );

    const handleNodeClick = useCallback(
      (_event: React.MouseEvent, node: WorkflowNode) => {
        onSelectNode(node);
      },
      [onSelectNode]
    );

    const handlePaneClick = useCallback(() => {
      onSelectNode(null);
    }, [onSelectNode]);

    // ── Zoom & Fit View Controls ────────────────────────────────────────────

    const handleZoomIn = useCallback(() => {
      try {
        zoomIn({ duration: 150 });
      } catch {}
      setZoomLevel((prev) => Math.min(200, prev + 10));
    }, [zoomIn]);

    const handleZoomOut = useCallback(() => {
      try {
        zoomOut({ duration: 150 });
      } catch {}
      setZoomLevel((prev) => Math.max(20, prev - 10));
    }, [zoomOut]);

    const handleFitView = useCallback(() => {
      try {
        fitView({ padding: 0.25, duration: 200 });
      } catch {}
      setZoomLevel(100);
    }, [fitView]);

    // Track zoom updates on wheel/pinch
    const handleMoveEnd = useCallback(() => {
      setZoomLevel(Math.round(getZoom() * 100));
    }, [getZoom]);

    // ── Drag & Drop from Catalogue ──────────────────────────────────────────

    const handleDragOver = useCallback((event: React.DragEvent) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
    }, []);

    const handleDrop = useCallback(
      (event: React.DragEvent) => {
        event.preventDefault();
        const rawData = event.dataTransfer.getData('application/reactflow');
        if (!rawData) return;

        try {
          const item = JSON.parse(rawData);
          const position = screenToFlowPosition({
            x: event.clientX,
            y: event.clientY,
          });

          pushSnapshot();

          const rawType = (item.type || 'action').toLowerCase();
          const nodeKey = generateUniqueNodeKey(rawType, graphRef.current.nodes);
          const newId = `node_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

          const newNode: WorkflowNode = {
            id: newId,
            type: rawType,
            position,
            selected: true,
            data: {
              nodeKey,
              label: item.label || 'New Node',
              nodeType: rawType,
              definitionType: item.definitionType || item.type,
              category: item.category || 'Actions',
              icon: item.icon || item.iconName,
              iconName: item.icon || item.iconName,
              config: item.config || {},
              outputs: item.outputs || [],
              inputs: item.inputs || [],
              isImplemented: item.isImplemented ?? true,
              executorRef: item.executorRef,
              onDuplicate: handleDuplicateNode,
              onDelete: handleDeleteNode,
            },
          };

          setNodes((nds) => [...nds.map((n) => ({ ...n, selected: false })), newNode]);
          onSelectNode(newNode);
        } catch {
          // ignore drop parse error
        }
      },
      [screenToFlowPosition, pushSnapshot, handleDuplicateNode, handleDeleteNode, onSelectNode]
    );

    // ── Imperative Handle for Parent Component ──────────────────────────────

    useImperativeHandle(
      ref,
      () => ({
        addNodeFromCatalogue: (item) => {
          pushSnapshot();
          const rawType = (item.type || (item.category === 'triggers' ? 'trigger' : item.category === 'conditions' ? 'condition' : 'action')).toLowerCase();
          const nodeKey = generateUniqueNodeKey(rawType, graphRef.current.nodes);
          const newId = `node_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

          // Offset position based on current count
          const count = graphRef.current.nodes.length;
          const position = {
            x: 220 + (count % 3) * 60,
            y: 120 + count * 80,
          };

          const newNode: WorkflowNode = {
            id: newId,
            type: rawType,
            position,
            selected: true,
            data: {
              nodeKey,
              label: item.label || 'New Node',
              nodeType: rawType,
              definitionType: item.definitionType || item.type,
              category: item.category || 'Actions',
              icon: item.icon || item.iconName,
              iconName: item.icon || item.iconName,
              config: item.defaultConfig || item.config || {},
              outputs: item.outputs || [],
              inputs: item.inputs || [],
              isImplemented: item.isImplemented ?? true,
              executorRef: item.executorRef,
              onDuplicate: handleDuplicateNode,
              onDelete: handleDeleteNode,
            },
          };

          setNodes((nds) => [...nds.map((n) => ({ ...n, selected: false })), newNode]);
          onSelectNode(newNode);
        },

        updateSelectedNodeData: (nodeId: string, updates: Partial<WorkflowNodeData>) => {
          pushSnapshot();
          setNodes((nds) =>
            nds.map((n) => {
              if (n.id !== nodeId) return n;
              return {
                ...n,
                data: {
                  ...n.data,
                  ...updates,
                },
              };
            })
          );
        },

        undo: handleUndo,
        redo: handleRedo,
        fitView: handleFitView,
        getGraph: () => graphRef.current,
      }),
      [
        pushSnapshot,
        handleDuplicateNode,
        handleDeleteNode,
        onSelectNode,
        handleUndo,
        handleRedo,
        handleFitView,
      ]
    );

    // ── Keyboard Shortcuts (Ctrl+Z, Ctrl+Y, Delete) ─────────────────────────

    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        // Ignore if typing inside input, textarea, or contentEditable
        const target = e.target as HTMLElement;
        if (
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable
        ) {
          return;
        }

        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          handleUndo();
        } else if (
          ((e.ctrlKey || e.metaKey) && e.key === 'y') ||
          ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z')
        ) {
          e.preventDefault();
          handleRedo();
        } else if (e.key === 'Delete' || e.key === 'Backspace') {
          if (selectedNodeId) {
            e.preventDefault();
            handleDeleteNode(selectedNodeId);
          }
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleUndo, handleRedo, handleDeleteNode, selectedNodeId]);

    const canUndo = history.past.length > 0;
    const canRedo = history.future.length > 0;

    return (
      <main
        className="flex-1 bg-slate-50/70 relative overflow-hidden flex flex-col h-full w-full select-none"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Floating Canvas Controls Toolbar */}
        <div
          data-no-pan
          className="absolute top-4 left-4 z-20 flex items-center gap-1 bg-white/95 backdrop-blur-md border border-gray-200 rounded-xl p-1 shadow-xs"
        >
          {/* Zoom In */}
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-1.5 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition cursor-pointer"
            title="Zoom In"
            aria-label="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          {/* Zoom % */}
          <span className="text-[11px] font-semibold text-gray-700 px-1 min-w-10 text-center">
            {zoomLevel}%
          </span>

          {/* Zoom Out */}
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-1.5 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition cursor-pointer"
            title="Zoom Out"
            aria-label="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-4 bg-gray-200 mx-0.5" />

          {/* Fit View */}
          <button
            type="button"
            onClick={handleFitView}
            className="p-1.5 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition cursor-pointer"
            title="Fit View"
            aria-label="Fit View"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          {/* Grid Toggle */}
          <button
            type="button"
            onClick={() => setShowGrid((prev) => !prev)}
            className={`p-1.5 rounded-lg transition cursor-pointer ${
              showGrid
                ? 'text-emerald-700 bg-emerald-50'
                : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
            }`}
            title="Toggle Grid"
            aria-label="Toggle Grid"
          >
            <Grid className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-4 bg-gray-200 mx-0.5" />

          {/* Undo */}
          <button
            type="button"
            onClick={handleUndo}
            disabled={!canUndo}
            className="p-1.5 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            title="Undo (Ctrl+Z)"
            aria-label="Undo"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>

          {/* Redo */}
          <button
            type="button"
            onClick={handleRedo}
            disabled={!canRedo}
            className="p-1.5 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            title="Redo (Ctrl+Y)"
            aria-label="Redo"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Real React Flow Canvas */}
        <div className="flex-1 w-full h-full relative">
          <ReactFlow
            nodes={enhancedNodes}
            edges={edges}
            nodeTypes={WORKFLOW_NODE_TYPES}
            edgeTypes={WORKFLOW_EDGE_TYPES}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onNodeDragStart={handleNodeDragStart}
            onConnect={handleConnect}
            onNodeClick={handleNodeClick}
            onPaneClick={handlePaneClick}
            onMoveEnd={handleMoveEnd}
            deleteKeyCode={null} // custom keydown handling with undo
            fitView
            minZoom={0.2}
            maxZoom={2.0}
            className="w-full h-full"
          >
            {showGrid && (
              <Background
                variant={BackgroundVariant.Dots}
                gap={18}
                size={1.5}
                color="#cbd5e1"
              />
            )}
          </ReactFlow>

          {/* Empty Canvas Overlay State when 0 nodes */}
          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-4">
              <div
                data-no-pan
                className="pointer-events-auto max-w-md w-full bg-white/95 backdrop-blur-md rounded-3xl border-2 border-dashed border-gray-300 p-8 text-center shadow-xs space-y-4"
              >
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-2xs">
                  <Workflow className="w-7 h-7" />
                </div>

                <div className="space-y-1.5">
                  <h2 className="text-base font-bold text-gray-900">
                    Drag a node here or add your first trigger
                  </h2>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    This automation currently has no configured workflow nodes. Select a trigger from the left catalogue to begin.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenCatalogue) {
                        onOpenCatalogue();
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Trigger Node</span>
                  </button>
                </div>

                <div className="pt-4 border-t border-gray-100 flex flex-wrap items-center justify-center gap-2 text-[10px] text-gray-500">
                  <span className="px-2 py-0.5 rounded-md bg-gray-50 border border-gray-200">
                    WhatsApp Message
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-gray-50 border border-gray-200">
                    Keyword Match
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-gray-50 border border-gray-200">
                    Webhook
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    );
  }
);

CanvasInner.displayName = 'CanvasInner';

// ── Exported Wrapper Providing ReactFlowProvider Context ────────────────────

export const WorkflowCanvas = forwardRef<WorkflowCanvasHandle, WorkflowCanvasProps>(
  (props, ref) => {
    return (
      <ReactFlowProvider>
        <CanvasInner {...props} ref={ref} />
      </ReactFlowProvider>
    );
  }
);

WorkflowCanvas.displayName = 'WorkflowCanvas';
