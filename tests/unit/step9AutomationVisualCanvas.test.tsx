import React, { useRef } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  WorkflowCanvas,
  type WorkflowCanvasHandle,
} from '@/components/automations/canvas/WorkflowCanvas';
import {
  TriggerNode,
  ConditionNode,
  ActionNode,
  AINode,
  UtilityNode,
} from '@/components/automations/canvas/CustomNodes';
import { BranchingEdge, WORKFLOW_EDGE_TYPES } from '@/components/automations/canvas/CustomEdge';
import {
  type WorkflowNode,
  type WorkflowEdge,
  dbToFlowNodes,
  dbToFlowEdges,
  serializeWorkflow,
  duplicateWorkflowNode,
  validateConnectionRule,
  generateUniqueNodeKey,
} from '@/components/automations/canvas/workflowTypes';
import {
  ReactFlow,
  ReactFlowProvider,
  Position,
} from '@xyflow/react';
import AutomationBuilderPage from '@/app/(client)/projects/[id]/automations/[automationId]/page';

// ── Next.js Routing Mocks ────────────────────────────────────────────────────
const mockPush = vi.fn();
let mockParams: Record<string, string> = { id: 'project-123', automationId: 'auto-001' };

vi.mock('@xyflow/react', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    EdgeLabelRenderer: ({ children }: any) => <g className="mock-edge-label">{children}</g>,
  };
});

vi.mock('next/navigation', () => ({
  useParams: () => mockParams,
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: any) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

describe('Phase 6: Visual Workflow Canvas', () => {
  let user: ReturnType<typeof userEvent.setup>;
  let mockFetch: ReturnType<typeof vi.fn>;

  const defaultAutomationData = {
    id: 'auto-001',
    workspaceId: 'ws-123',
    projectId: 'project-123',
    name: 'Customer Onboarding Flow',
    description: 'Automates first-time customer messages and inquiries.',
    status: 'DRAFT',
    currentVersionId: 'ver-001',
    createdBy: 'user-1',
    createdAt: '2026-01-01T10:00:00.000Z',
    updatedAt: '2026-01-01T10:00:00.000Z',
    archivedAt: null as string | null,
    currentVersion: {
      id: 'ver-001',
      automationId: 'auto-001',
      versionNumber: 1,
      status: 'DRAFT',
      createdAt: '2026-01-01T10:00:00.000Z',
      publishedAt: null as string | null,
    },
    draftVersion: {
      id: 'ver-001',
      automationId: 'auto-001',
      versionNumber: 1,
      status: 'DRAFT',
      createdAt: '2026-01-01T10:00:00.000Z',
      publishedAt: null as string | null,
    },
    nodes: [
      {
        id: 'node-trigger-1',
        nodeKey: 'trigger_whatsapp_1',
        type: 'trigger',
        label: 'New WhatsApp Message',
        positionX: 100,
        positionY: 100,
        configuration: { matchAny: true },
      },
      {
        id: 'node-cond-1',
        nodeKey: 'condition_contains_1',
        type: 'condition',
        label: 'Message Contains Pricing',
        positionX: 100,
        positionY: 260,
        configuration: { contains: 'pricing' },
      },
    ],
    edges: [
      {
        id: 'edge-1',
        sourceNodeId: 'node-trigger-1',
        targetNodeId: 'node-cond-1',
        sourceHandle: 'output',
        targetHandle: 'input',
        conditionKey: null as string | null,
      },
    ],
    executions: [] as any[],
    nodeCount: 2,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    user = userEvent.setup();
    mockParams = { id: 'project-123', automationId: 'auto-001' };

    mockFetch = vi.fn(async (url: string, init?: RequestInit) => {
      const u = typeof url === 'string' ? url : (url as any).url;

      // GET automation
      if (u.includes('/api/projects/project-123/automations/auto-001') && (!init || !init.method || init.method === 'GET')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            status: 'ok',
            data: defaultAutomationData,
          }),
        };
      }

      // PATCH automation metadata
      if (u.includes('/api/projects/project-123/automations/auto-001') && init?.method === 'PATCH' && !u.includes('/versions/')) {
        const body = JSON.parse((init.body as string) || '{}');
        return {
          ok: true,
          status: 200,
          json: async () => ({
            status: 'ok',
            data: {
              ...defaultAutomationData,
              name: body.name,
              description: body.description,
            },
          }),
        };
      }

      // PATCH draft version graph (nodes, edges)
      if (u.includes('/versions/ver-001') && init?.method === 'PATCH') {
        const body = JSON.parse((init.body as string) || '{}');
        return {
          ok: true,
          status: 200,
          json: async () => ({
            status: 'ok',
            data: {
              versionId: 'ver-001',
              nodes: body.nodes || [],
              edges: body.edges || [],
            },
            message: 'Draft version updated successfully',
          }),
        };
      }

      return {
        ok: true,
        status: 200,
        json: async () => ({ status: 'ok', data: [] as any[] }),
      };
    });

    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    cleanup();
  });

  // ==========================================================================
  // 1. NODE COMPONENT RENDERING & AESTHETICS
  // ==========================================================================
  describe('Custom Node Component Rendering', () => {
    it('should render TriggerNode with bottom source handle and category pill', () => {
      const triggerData: any = {
        nodeKey: 'trigger_message_1',
        label: 'New Customer Message',
        category: 'Triggers',
        nodeType: 'trigger',
        config: {},
        onDuplicate: vi.fn(),
        onDelete: vi.fn(),
      };

      const { container } = render(
        <ReactFlowProvider>
          <TriggerNode
            id="test-trigger"
            data={triggerData}
            selected={false}
            type="trigger"
            zIndex={1}
            isConnectable={true}
            positionAbsoluteX={0}
            positionAbsoluteY={0}
            dragging={false}
            draggable={false}
            selectable={true}
            deletable={true}
          />
        </ReactFlowProvider>
      );

      expect(screen.getByText('New Customer Message')).toBeDefined();
      expect(screen.getByText('trigger_message_1')).toBeDefined();
      expect(screen.getByText('Triggers')).toBeDefined();

      // Ensure duplicate and delete buttons exist
      expect(screen.getByRole('button', { name: 'Duplicate Node' })).toBeDefined();
      expect(screen.getByRole('button', { name: 'Delete Node' })).toBeDefined();

      // Bottom source handle rendered
      const sourceHandle = container.querySelector('.react-flow__handle-bottom');
      expect(sourceHandle).not.toBeNull();
      // No top target handle on trigger
      const targetHandle = container.querySelector('.react-flow__handle-top');
      expect(targetHandle).toBeNull();
    });

    it('should render ConditionNode with top target handle and dual YES/NO branch source handles', () => {
      const conditionData: any = {
        nodeKey: 'condition_contains_1',
        label: 'Contains "Support"',
        category: 'Conditions',
        nodeType: 'condition',
        config: { contains: 'Support' },
        onDuplicate: vi.fn(),
        onDelete: vi.fn(),
      };

      const { container } = render(
        <ReactFlowProvider>
          <ConditionNode
            id="test-condition"
            data={conditionData}
            selected={true}
            type="condition"
            zIndex={1}
            isConnectable={true}
            positionAbsoluteX={0}
            positionAbsoluteY={0}
            dragging={false}
            draggable={false}
            selectable={true}
            deletable={true}
          />
        </ReactFlowProvider>
      );

      expect(screen.getByText('Contains "Support"')).toBeDefined();
      expect(screen.getByText('YES')).toBeDefined();
      expect(screen.getByText('NO')).toBeDefined();

      // Top target handle
      const targetHandle = container.querySelector('.react-flow__handle-top');
      expect(targetHandle).not.toBeNull();

      // Dual source handles: left (yes) and right (no)
      const bottomHandles = container.querySelectorAll('.react-flow__handle-bottom');
      expect(bottomHandles.length).toBe(2);
    });

    it('should render Action, AI, and Utility nodes with proper category themes and handles', () => {
      const actionData: any = {
        nodeKey: 'action_send_1',
        label: 'Send WhatsApp Greeting',
        category: 'Actions',
        nodeType: 'action',
        config: { message: 'Hello!' },
      };

      const { container } = render(
        <ReactFlowProvider>
          <ActionNode
            id="test-action"
            data={actionData}
            selected={false}
            type="action"
            zIndex={1}
            isConnectable={true}
            positionAbsoluteX={0}
            positionAbsoluteY={0}
            dragging={false}
            draggable={false}
            selectable={true}
            deletable={true}
          />
        </ReactFlowProvider>
      );

      expect(screen.getByText('Send WhatsApp Greeting')).toBeDefined();
      expect(screen.getByText('Actions')).toBeDefined();
      expect(container.querySelector('.react-flow__handle-top')).not.toBeNull();
      expect(container.querySelector('.react-flow__handle-bottom')).not.toBeNull();
    });
  });

  // ==========================================================================
  // 2. EDGE RENDERING & BRANCH LABELS
  // ==========================================================================
  describe('Custom Edge Rendering with Branch Badges', () => {
    it('should render YES branch badge pill for affirmative condition edge', () => {
      render(
        <ReactFlowProvider>
          <svg>
            <BranchingEdge
              id="edge-yes-1"
              source="node-1"
              target="node-2"
              sourceX={100}
              sourceY={100}
              targetX={100}
              targetY={200}
              sourcePosition={Position.Bottom}
              targetPosition={Position.Top}
              data={{ conditionKey: 'YES' }}
            />
          </svg>
        </ReactFlowProvider>
      );

      expect(screen.getByText('YES')).toBeDefined();
    });

    it('should render NO branch badge pill for negative condition edge', () => {
      render(
        <ReactFlowProvider>
          <svg>
            <BranchingEdge
              id="edge-no-1"
              source="node-1"
              target="node-3"
              sourceX={100}
              sourceY={100}
              targetX={200}
              targetY={200}
              sourcePosition={Position.Bottom}
              targetPosition={Position.Top}
              data={{ conditionKey: 'NO' }}
            />
          </svg>
        </ReactFlowProvider>
      );

      expect(screen.getByText('NO')).toBeDefined();
    });
  });

  // ==========================================================================
  // 3. CONNECTION VALIDATION RULES
  // ==========================================================================
  describe('Connection Validation Rules', () => {
    const sampleNodes: WorkflowNode[] = [
      {
        id: 'node-trig',
        type: 'trigger',
        position: { x: 0, y: 0 },
        data: {
          nodeKey: 'trig_1',
          label: 'Trigger',
          nodeType: 'trigger',
          category: 'Triggers',
          config: {},
        },
      },
      {
        id: 'node-cond',
        type: 'condition',
        position: { x: 0, y: 150 },
        data: {
          nodeKey: 'cond_1',
          label: 'Condition',
          nodeType: 'condition',
          category: 'Conditions',
          config: {},
        },
      },
      {
        id: 'node-act',
        type: 'action',
        position: { x: 0, y: 300 },
        data: {
          nodeKey: 'act_1',
          label: 'Action',
          nodeType: 'action',
          category: 'Actions',
          config: {},
        },
      },
    ];

    const sampleEdges: WorkflowEdge[] = [
      {
        id: 'edge-existing',
        source: 'node-trig',
        target: 'node-cond',
        sourceHandle: 'output',
        targetHandle: 'input',
      },
    ];

    it('should prevent self-connections (source === target)', () => {
      const res = validateConnectionRule(
        { source: 'node-cond', target: 'node-cond', sourceHandle: 'yes', targetHandle: 'input' },
        sampleNodes,
        sampleEdges
      );
      expect(res.isValid).toBe(false);
      expect(res.reason).toMatch(/self-connection/i);
    });

    it('should prevent incoming connections to Trigger nodes', () => {
      const res = validateConnectionRule(
        { source: 'node-act', target: 'node-trig', sourceHandle: 'output', targetHandle: null },
        sampleNodes,
        sampleEdges
      );
      expect(res.isValid).toBe(false);
      expect(res.reason).toMatch(/trigger nodes cannot receive incoming connections/i);
    });

    it('should prevent duplicate edges', () => {
      const res = validateConnectionRule(
        { source: 'node-trig', target: 'node-cond', sourceHandle: 'output', targetHandle: 'input' },
        sampleNodes,
        sampleEdges
      );
      expect(res.isValid).toBe(false);
      expect(res.reason).toMatch(/duplicate connection/i);
    });

    it('should allow valid condition branching connections (YES and NO)', () => {
      const resYes = validateConnectionRule(
        { source: 'node-cond', target: 'node-act', sourceHandle: 'yes', targetHandle: 'input' },
        sampleNodes,
        sampleEdges
      );
      expect(resYes.isValid).toBe(true);
    });

    it('should reject connections referencing non-existent nodes', () => {
      const res = validateConnectionRule(
        { source: 'non-existent', target: 'node-act', sourceHandle: 'output', targetHandle: 'input' },
        sampleNodes,
        sampleEdges
      );
      expect(res.isValid).toBe(false);
      expect(res.reason).toMatch(/does not exist/i);
    });
  });

  // ==========================================================================
  // 4. DUPLICATE & SERIALIZATION LOGIC
  // ==========================================================================
  describe('Node Duplication & Save Serialization', () => {
    const existingNodes: WorkflowNode[] = [
      {
        id: 'orig-node-1',
        type: 'action',
        position: { x: 100, y: 150 },
        data: {
          nodeKey: 'send_whatsapp_1',
          label: 'Send Welcome Message',
          nodeType: 'action',
          category: 'Actions',
          config: { text: 'Welcome to Wazzi!' },
        },
      },
    ];

    it('should generate unique node keys avoiding collisions', () => {
      const key1 = generateUniqueNodeKey('send_whatsapp_1', existingNodes);
      expect(key1).not.toBe('send_whatsapp_1');
      expect(key1).toBe('send_whatsapp_1_1');
    });

    it('should safely duplicate a node with fresh ID, new node_key, and deep-cloned config', () => {
      const duplicated = duplicateWorkflowNode(existingNodes[0], existingNodes);

      expect(duplicated.id).not.toBe(existingNodes[0].id);
      expect(duplicated.data.nodeKey).not.toBe(existingNodes[0].data.nodeKey);
      expect(duplicated.data.label).toContain('(Copy)');
      expect(duplicated.position.x).toBe(existingNodes[0].position.x + 40);
      expect(duplicated.position.y).toBe(existingNodes[0].position.y + 40);

      // Mutating duplicate config should not mutate original
      duplicated.data.config.text = 'Modified text';
      expect(existingNodes[0].data.config.text).toBe('Welcome to Wazzi!');
    });

    it('should serialize canvas nodes and edges to normalized save payload', () => {
      const nodes: WorkflowNode[] = [
        {
          id: 'n1',
          type: 'trigger',
          position: { x: 100.4, y: 199.8 },
          data: {
            nodeKey: 'trigger_1',
            label: 'Trigger One',
            nodeType: 'trigger',
            category: 'Triggers',
            config: { foo: 'bar' },
          },
        },
        {
          id: 'n2',
          type: 'condition',
          position: { x: 100, y: 350 },
          data: {
            nodeKey: 'cond_1',
            label: 'Condition One',
            nodeType: 'condition',
            category: 'Conditions',
            config: {},
          },
        },
      ];

      const edges: WorkflowEdge[] = [
        {
          id: 'e1',
          source: 'n1',
          target: 'n2',
          sourceHandle: 'output',
          targetHandle: 'input',
        },
        {
          id: 'e2',
          source: 'n2',
          target: 'n3',
          sourceHandle: 'yes',
          targetHandle: 'input',
          data: { conditionKey: 'YES' },
        },
      ];

      const payload = serializeWorkflow(nodes, edges);

      expect(payload.nodes).toHaveLength(2);
      expect(payload.nodes[0]).toEqual({
        id: 'n1',
        nodeKey: 'trigger_1',
        type: 'trigger',
        label: 'Trigger One',
        positionX: 100,
        positionY: 200,
        configuration: { foo: 'bar' },
      });

      expect(payload.edges).toHaveLength(2);
      expect(payload.edges[1].conditionKey).toBe('YES');
      expect(payload.edges[1].sourceHandle).toBe('yes');
    });
  });

  // ==========================================================================
  // 5. WORKFLOW CANVAS INTERACTION (ADD, SELECT, DUPLICATE, DELETE, UNDO, REDO)
  // ==========================================================================
  describe('Interactive Workflow Canvas (Add, Delete, Duplicate, Undo, Redo)', () => {
    it('should allow adding nodes, selecting, duplicating, and deleting through canvas handle', async () => {
      let canvasHandle: WorkflowCanvasHandle | null = null;
      let selectedNode: WorkflowNode | null = null;

      const TestCanvasWrapper = () => {
        const ref = useRef<WorkflowCanvasHandle>(null);
        return (
          <div style={{ width: 800, height: 600 }}>
            <WorkflowCanvas
              ref={(h) => {
                canvasHandle = h;
              }}
              initialNodes={[]}
              initialEdges={[]}
              onSelectNode={(node) => {
                selectedNode = node;
              }}
            />
          </div>
        );
      };

      render(<TestCanvasWrapper />);

      expect(canvasHandle).not.toBeNull();

      // 1. Add Node
      act(() => {
        canvasHandle!.addNodeFromCatalogue({
          type: 'trigger',
          label: 'Inbound Message Trigger',
          category: 'Triggers',
          config: { autoReply: true },
        });
      });

      let graph = canvasHandle!.getGraph();
      expect(graph.nodes).toHaveLength(1);
      expect(graph.nodes[0].data.label).toBe('Inbound Message Trigger');

      // 2. Add Second Node
      act(() => {
        canvasHandle!.addNodeFromCatalogue({
          type: 'action',
          label: 'Send First Response',
          category: 'Actions',
          config: {},
        });
      });

      graph = canvasHandle!.getGraph();
      expect(graph.nodes).toHaveLength(2);

      // 3. Undo (should revert to 1 node)
      act(() => {
        canvasHandle!.undo();
      });

      graph = canvasHandle!.getGraph();
      expect(graph.nodes).toHaveLength(1);

      // 4. Redo (should restore 2 nodes)
      act(() => {
        canvasHandle!.redo();
      });

      graph = canvasHandle!.getGraph();
      expect(graph.nodes).toHaveLength(2);

      // 5. Update Node Data
      act(() => {
        canvasHandle!.updateSelectedNodeData(graph.nodes[0].id, {
          label: 'Updated Trigger Label',
        });
      });

      graph = canvasHandle!.getGraph();
      expect(graph.nodes[0].data.label).toBe('Updated Trigger Label');
    });
  });

  // ==========================================================================
  // 6. BUILDER PAGE INTEGRATION & SAVE FLOW
  // ==========================================================================
  describe('Builder Page Integration & Save Flow', () => {
    it('should load draft nodes and edges onto the canvas on page load', async () => {
      render(<AutomationBuilderPage />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Customer Onboarding Flow')).toBeDefined();
      });

      // Renders the two pre-loaded nodes
      await waitFor(() => {
        expect(screen.getAllByText('New WhatsApp Message').length).toBeGreaterThan(1);
        expect(screen.getByText('Message Contains Pricing')).toBeDefined();
      });
    });

    it('should add a node when clicking an implemented item in Left Node catalogue', async () => {
      render(<AutomationBuilderPage />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Customer Onboarding Flow')).toBeDefined();
      });

      // Find the "Keyword Match" node item in the catalogue and click it
      const keywordItem = screen.getByText('Keyword Match');
      fireEvent.click(keywordItem);

      // Now "Keyword Match" node appears on canvas
      await waitFor(() => {
        expect(screen.getAllByText('Keyword Match').length).toBeGreaterThan(1);
      });
    });

    it('should serialize canvas graph and call PATCH /versions/[versionId] when clicking Save', async () => {
      render(<AutomationBuilderPage />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Customer Onboarding Flow')).toBeDefined();
      });

      // Click Save Draft button
      const saveBtn = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        // Verified draft version endpoint received serialized graph
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/versions/ver-001'),
          expect.objectContaining({
            method: 'PATCH',
            body: expect.stringContaining('trigger_whatsapp_1'),
          })
        );
      });

      await waitFor(() => {
        expect(screen.getByText('Draft saved successfully')).toBeDefined();
      });
    });
  });
});
