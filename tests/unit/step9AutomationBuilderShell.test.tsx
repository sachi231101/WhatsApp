import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AutomationBuilderPage from '@/app/(client)/projects/[id]/automations/[automationId]/page';

// ── Next.js Routing Mocks ────────────────────────────────────────────────────
const mockPush = vi.fn();
let mockParams: Record<string, string> = { id: 'project-123', automationId: 'auto-001' };

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

describe('Phase 5: Automation Builder Shell', () => {
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
    nodes: [] as any[],
    edges: [] as any[],
    executions: [] as any[],
    nodeCount: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    user = userEvent.setup();
    mockParams = { id: 'project-123', automationId: 'auto-001' };

    mockFetch = vi.fn(async (url: string, init?: RequestInit) => {
      const u = typeof url === 'string' ? url : (url as any).url;

      // GET single automation (valid)
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

      // Invalid automation ID (404)
      if (u.includes('/api/projects/project-123/automations/auto-invalid') && (!init || !init.method || init.method === 'GET')) {
        return {
          ok: false,
          status: 404,
          json: async () => ({
            status: 'error',
            error: 'Automation not found or access denied for this project.',
          }),
        };
      }

      // Cross-project / Unauthorized (403)
      if (u.includes('/api/projects/project-isolated/automations') && (!init || !init.method || init.method === 'GET')) {
        return {
          ok: false,
          status: 403,
          json: async () => ({
            status: 'error',
            error: 'Forbidden: You do not have permission to access this automation.',
          }),
        };
      }

      // PATCH update automation draft
      if (u.includes('/api/projects/project-123/automations/auto-001') && init?.method === 'PATCH') {
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
  // 1. DATA LOADING & DRAFT STATE
  // ==========================================================================
  describe('Data Loading & Draft State', () => {
    it('should display skeleton loading state initially and then render automation details', async () => {
      render(<AutomationBuilderPage />);

      // Accessible skeleton loader check
      expect(screen.getByRole('status', { name: /loading automation builder/i })).toBeDefined();

      await waitFor(() => {
        expect(screen.getByDisplayValue('Customer Onboarding Flow')).toBeDefined();
      });

      // Status pill & draft version pill
      expect(screen.getByText('DRAFT')).toBeDefined();
      expect(screen.getByText('v1 (Draft)')).toBeDefined();
      expect(screen.getByDisplayValue('Automates first-time customer messages and inquiries.')).toBeDefined();
    });

    it('should display error state when automation is not found (404)', async () => {
      mockParams = { id: 'project-123', automationId: 'auto-invalid' };
      render(<AutomationBuilderPage />);

      await waitFor(() => {
        expect(screen.getByText('Unable to Load Workflow')).toBeDefined();
        expect(
          screen.getByText(/automation not found or access denied for this project/i)
        ).toBeDefined();
      });

      expect(screen.getByRole('link', { name: /back to automations/i })).toBeDefined();
    });

    it('should enforce project isolation and display 403 error on unauthorized project', async () => {
      mockParams = { id: 'project-isolated', automationId: 'auto-001' };
      render(<AutomationBuilderPage />);

      await waitFor(() => {
        expect(screen.getByText('Unable to Load Workflow')).toBeDefined();
        expect(
          screen.getByText(/forbidden: you do not have permission/i)
        ).toBeDefined();
      });
    });
  });

  // ==========================================================================
  // 2. HEADER ACTIONS
  // ==========================================================================
  describe('Header Actions', () => {
    it('should render Save, Test Workflow, and Publish buttons with proper initial states', async () => {
      render(<AutomationBuilderPage />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Customer Onboarding Flow')).toBeDefined();
      });

      // Save button is enabled
      const saveBtn = screen.getByRole('button', { name: /save/i });
      expect(saveBtn).toBeDefined();
      expect((saveBtn as HTMLButtonElement).disabled).toBe(false);

      // Test Workflow & Publish are disabled (not fake implemented)
      const testBtn = screen.getByRole('button', { name: /test workflow/i });
      expect(testBtn).toBeDefined();
      expect((testBtn as HTMLButtonElement).disabled).toBe(true);

      const publishBtn = screen.getByRole('button', { name: /publish/i });
      expect(publishBtn).toBeDefined();
      expect((publishBtn as HTMLButtonElement).disabled).toBe(true);
    });

    it('should successfully save draft changes when clicking Save', async () => {
      render(<AutomationBuilderPage />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Customer Onboarding Flow')).toBeDefined();
      });

      const nameInput = screen.getByDisplayValue('Customer Onboarding Flow');
      fireEvent.change(nameInput, { target: { value: 'Updated Onboarding Name' } });

      const saveBtn = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/projects/project-123/automations/auto-001'),
          expect.objectContaining({
            method: 'PATCH',
            body: expect.stringContaining('Updated Onboarding Name'),
          })
        );
      });

      await waitFor(() => {
        expect(screen.getByText('Draft saved successfully')).toBeDefined();
      });
    });
  });

  // ==========================================================================
  // 3. TABS
  // ==========================================================================
  describe('Navigation Tabs', () => {
    it('should switch between Builder, Settings, Execution Logs, and Analytics tabs', async () => {
      render(<AutomationBuilderPage />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Customer Onboarding Flow')).toBeDefined();
      });

      // Builder tab is active by default
      expect(screen.getByText('Add Node')).toBeDefined();

      // Switch to Settings tab
      const settingsTab = screen.getByRole('button', { name: /^Settings$/i });
      fireEvent.click(settingsTab);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Automation Settings' })).toBeDefined();
        expect(screen.getByText('auto-001')).toBeDefined();
      });

      // Switch to Execution Logs tab
      const logsTab = screen.getByRole('button', { name: /execution logs/i });
      fireEvent.click(logsTab);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Execution Logs' })).toBeDefined();
      });

      // Switch to Analytics tab
      const analyticsTab = screen.getByRole('button', { name: /analytics/i });
      fireEvent.click(analyticsTab);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Automation Analytics' })).toBeDefined();
      });
    });
  });

  // ==========================================================================
  // 4. THREE-COLUMN BUILDER STRUCTURE & CANVAS
  // ==========================================================================
  describe('Three-Column Builder & Canvas', () => {
    it('should render Left Add Node panel with categories: Triggers, Conditions, Actions, AI, Utilities', async () => {
      render(<AutomationBuilderPage />);

      await waitFor(() => {
        expect(screen.getByText('Add Node')).toBeDefined();
      });

      // Left panel categories
      expect(screen.getByRole('button', { name: 'Triggers' })).toBeDefined();
      expect(screen.getByRole('button', { name: 'Conditions' })).toBeDefined();
      expect(screen.getByRole('button', { name: 'Actions' })).toBeDefined();
      expect(screen.getByRole('button', { name: 'AI' })).toBeDefined();
      expect(screen.getByRole('button', { name: 'Utilities' })).toBeDefined();

      // Node catalogue items
      expect(screen.getAllByText('New WhatsApp Message').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Keyword Match').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Send WhatsApp Message').length).toBeGreaterThan(0);
    });

    it('should render Center Canvas with empty workflow state', async () => {
      render(<AutomationBuilderPage />);

      await waitFor(() => {
        expect(
          screen.getByText('Drag a node here or add your first trigger')
        ).toBeDefined();
      });

      expect(
        screen.getByText(/this automation currently has no configured workflow nodes/i)
      ).toBeDefined();

      expect(screen.getByRole('button', { name: /\+ add trigger node/i })).toBeDefined();
    });

    it('should provide zoom in, zoom out, fit view, and grid toggle controls on canvas', async () => {
      render(<AutomationBuilderPage />);

      await waitFor(() => {
        expect(screen.getByText('100%')).toBeDefined();
      });

      const zoomInBtn = screen.getByLabelText('Zoom In');
      const zoomOutBtn = screen.getByLabelText('Zoom Out');
      const fitViewBtn = screen.getByLabelText('Fit View');
      const toggleGridBtn = screen.getByLabelText('Toggle Grid');

      // Zoom In to 110%
      fireEvent.click(zoomInBtn);
      expect(screen.getByText('110%')).toBeDefined();

      // Zoom Out to 100%
      fireEvent.click(zoomOutBtn);
      expect(screen.getByText('100%')).toBeDefined();

      // Fit View resets to 100%
      fireEvent.click(zoomInBtn);
      fireEvent.click(fitViewBtn);
      expect(screen.getByText('100%')).toBeDefined();

      // Grid toggle
      fireEvent.click(toggleGridBtn);
      expect(toggleGridBtn).toBeDefined();
    });

    it('should render Right Node Configuration panel with unselected state', async () => {
      render(<AutomationBuilderPage />);

      await waitFor(() => {
        expect(screen.getByText('Node Configuration')).toBeDefined();
      });

      expect(screen.getByText('Select a node to configure it')).toBeDefined();
      expect(
        screen.getByText(/click on any node in the workflow canvas/i)
      ).toBeDefined();
    });
  });

  // ==========================================================================
  // 5. BOTTOM RECENT EXECUTIONS
  // ==========================================================================
  describe('Bottom Recent Executions Panel', () => {
    it('should render Recent Executions panel with clean empty state for new automation', async () => {
      render(<AutomationBuilderPage />);

      await waitFor(() => {
        expect(screen.getByText('Recent Executions')).toBeDefined();
      });

      // Click to expand executions panel
      const executionsHeader = screen.getByText('Recent Executions');
      fireEvent.click(executionsHeader);

      await waitFor(() => {
        expect(screen.getByText('No executions recorded yet')).toBeDefined();
        expect(
          screen.getByText(/when this automation runs or processes test messages/i)
        ).toBeDefined();
      });
    });
  });
});
