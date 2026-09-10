import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProjectAutomationsPage from '@/app/(client)/projects/[id]/automations/page';

// ── Mock Next Navigation ───────────────────────────────────────────────────
const mockPush = vi.fn();
let mockParams = { id: 'project-123' };

vi.mock('next/navigation', () => ({
  useParams: () => mockParams,
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: any) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

// ── Sample Test Automations ────────────────────────────────────────────────
interface MockAutomation {
  id: string;
  workspaceId: string;
  projectId: string;
  name: string;
  description: string | null;
  status: string;
  currentVersionId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  currentVersion: {
    id: string;
    automationId: string;
    versionNumber: number;
    status: string;
  };
  nodeCount: number;
  triggerType: string | null;
  lastRunAt: string | null;
}

const INITIAL_MOCK_AUTOMATIONS: MockAutomation[] = [
  {
    id: 'auto-001',
    workspaceId: 'ws-123',
    projectId: 'project-123',
    name: 'Welcome Onboarding Flow',
    description: 'Sends greeting and qualifies new leads when they message.',
    status: 'ACTIVE',
    currentVersionId: 'ver-001',
    createdBy: 'user-1',
    createdAt: '2026-01-01T10:00:00.000Z',
    updatedAt: '2026-01-02T12:00:00.000Z',
    archivedAt: null,
    currentVersion: {
      id: 'ver-001',
      automationId: 'auto-001',
      versionNumber: 1,
      status: 'PUBLISHED',
    },
    nodeCount: 5,
    triggerType: 'trigger_whatsapp_message',
    lastRunAt: '2026-01-02T11:45:00.000Z',
  },
  {
    id: 'auto-002',
    workspaceId: 'ws-123',
    projectId: 'project-123',
    name: 'Abandoned Cart Followup',
    description: 'Follows up 2 hours after customer drops off checkout.',
    status: 'DRAFT',
    currentVersionId: 'ver-002',
    createdBy: 'user-1',
    createdAt: '2026-01-01T10:00:00.000Z',
    updatedAt: '2026-01-02T12:00:00.000Z',
    archivedAt: null,
    currentVersion: {
      id: 'ver-002',
      automationId: 'auto-002',
      versionNumber: 1,
      status: 'DRAFT',
    },
    nodeCount: 2,
    triggerType: 'trigger_keyword',
    lastRunAt: null,
  },
  {
    id: 'auto-003',
    workspaceId: 'ws-123',
    projectId: 'project-123',
    name: 'Weekend Support Auto-Responder',
    description: 'Informs customers of weekend support availability.',
    status: 'PAUSED',
    currentVersionId: 'ver-003',
    createdBy: 'user-1',
    createdAt: '2026-01-01T10:00:00.000Z',
    updatedAt: '2026-01-02T12:00:00.000Z',
    archivedAt: null,
    currentVersion: {
      id: 'ver-003',
      automationId: 'auto-003',
      versionNumber: 2,
      status: 'PUBLISHED',
    },
    nodeCount: 3,
    triggerType: 'trigger_whatsapp_message',
    lastRunAt: '2026-01-01T15:00:00.000Z',
  },
  {
    id: 'auto-004',
    workspaceId: 'ws-123',
    projectId: 'project-123',
    name: 'Legacy Promo Workflow',
    description: 'Old Black Friday promo auto-responder.',
    status: 'ARCHIVED',
    currentVersionId: 'ver-004',
    createdBy: 'user-1',
    createdAt: '2025-11-01T10:00:00.000Z',
    updatedAt: '2025-12-01T12:00:00.000Z',
    archivedAt: '2025-12-01T12:00:00.000Z',
    currentVersion: {
      id: 'ver-004',
      automationId: 'auto-004',
      versionNumber: 1,
      status: 'ARCHIVED',
    },
    nodeCount: 1,
    triggerType: null,
    lastRunAt: null,
  },
];

describe('Phase 3: Automation List Screen', () => {
  let user: ReturnType<typeof userEvent.setup>;
  let mockFetch: ReturnType<typeof vi.fn>;
  let mockAutomations: any[];

  beforeEach(() => {
    vi.clearAllMocks();
    user = userEvent.setup();
    mockParams = { id: 'project-123' };
    mockAutomations = JSON.parse(JSON.stringify(INITIAL_MOCK_AUTOMATIONS));

    mockFetch = vi.fn(async (url: string, init?: RequestInit) => {
      const u = typeof url === 'string' ? url : (url as any).url;

      // Project info endpoint
      if (u.includes('/api/projects/project-123') && !u.includes('/automations')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            status: 'ok',
            data: { id: 'project-123', name: 'E-Commerce Project', userRole: 'owner' },
          }),
        };
      }

      // Other project for isolation check
      if (u.includes('/api/projects/project-isolated') && !u.includes('/automations')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            status: 'ok',
            data: { id: 'project-isolated', name: 'Isolated Unit', userRole: 'viewer' },
          }),
        };
      }

      // List automations
      if (u.includes('/api/projects/project-123/automations') && (!init || !init.method || init.method === 'GET')) {
        const urlObj = new URL(u, 'http://localhost');
        const statusParam = urlObj.searchParams.get('status');
        const searchParam = urlObj.searchParams.get('search')?.toLowerCase();

        let filtered = [...mockAutomations];
        if (statusParam && statusParam !== 'ALL') {
          filtered = filtered.filter((a) => a.status === statusParam);
        }
        if (searchParam) {
          filtered = filtered.filter(
            (a) => a.name.toLowerCase().includes(searchParam) || (a.description && a.description.toLowerCase().includes(searchParam))
          );
        }

        return {
          ok: true,
          status: 200,
          json: async () => ({
            status: 'ok',
            data: filtered,
            totalCount: filtered.length,
          }),
        };
      }

      // Empty project list
      if (u.includes('/api/projects/project-isolated/automations') && (!init || !init.method || init.method === 'GET')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            status: 'ok',
            data: [] as any[],
            totalCount: 0,
          }),
        };
      }

      // Action: Create
      if (u.includes('/api/projects/project-123/automations') && init?.method === 'POST') {
        const body = JSON.parse((init.body as string) || '{}');
        const newAuto: MockAutomation = {
          id: 'auto-999',
          workspaceId: 'ws-123',
          projectId: 'project-123',
          name: body.name,
          description: body.description || null,
          status: 'DRAFT',
          currentVersionId: 'ver-999',
          createdBy: 'user-1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          archivedAt: null,
          currentVersion: {
            id: 'ver-999',
            automationId: 'auto-999',
            versionNumber: 1,
            status: 'DRAFT',
          },
          nodeCount: 0,
          triggerType: null,
          lastRunAt: null,
        };
        mockAutomations.push(newAuto);
        return {
          ok: true,
          status: 201,
          json: async () => ({
            status: 'ok',
            data: { automation: newAuto, draftVersion: newAuto.currentVersion },
          }),
        };
      }

      // Action: Activate
      if (u.includes('/activate') && init?.method === 'POST') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ status: 'ok', data: { id: 'auto-002', status: 'ACTIVE' } }),
        };
      }

      // Action: Pause
      if (u.includes('/pause') && init?.method === 'POST') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ status: 'ok', data: { id: 'auto-001', status: 'PAUSED' } }),
        };
      }

      // Action: Archive
      if (u.includes('/api/projects/project-123/automations/auto-001') && init?.method === 'DELETE') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ status: 'ok', message: 'Automation archived successfully' }),
        };
      }

      // Action: Duplicate
      if (u.includes('/duplicate') && init?.method === 'POST') {
        return {
          ok: true,
          status: 201,
          json: async () => ({
            status: 'ok',
            data: {
              automation: { id: 'auto-dup', name: 'Welcome Onboarding Flow (Copy)' },
              draftVersion: { id: 'ver-dup', versionNumber: 1 },
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
  // 1. LIST RENDERING
  // ==========================================================================
  it('should render the automations header, title, and search field', async () => {
    render(<ProjectAutomationsPage />);

    expect(screen.getByRole('status', { name: /loading automations/i })).toBeDefined();

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /automations/i })).toBeDefined();
    });

    expect(screen.getByText('Manage workflows that automate your business.')).toBeDefined();
    expect(screen.getByPlaceholderText('Search automations, workflows...')).toBeDefined();
    expect(screen.getByText('+ Create Automation')).toBeDefined();
  });

  it('should render automation cards and table records with real fields', async () => {
    render(<ProjectAutomationsPage />);

    await waitFor(() => {
      expect(screen.getAllByText('Welcome Onboarding Flow').length).toBeGreaterThan(0);
    });

    expect(screen.getAllByText('Abandoned Cart Followup').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Weekend Support Auto-Responder').length).toBeGreaterThan(0);
    expect(screen.getAllByText('ACTIVE').length).toBeGreaterThan(0);
    expect(screen.getAllByText('DRAFT').length).toBeGreaterThan(0);
    expect(screen.getAllByText('PAUSED').length).toBeGreaterThan(0);
    expect(screen.getAllByText('WhatsApp Message').length).toBeGreaterThan(0);
  });

  // ==========================================================================
  // 2. EMPTY STATE
  // ==========================================================================
  it('should render empty state when project has no automations', async () => {
    mockParams = { id: 'project-isolated' };
    render(<ProjectAutomationsPage />);

    await waitFor(() => {
      expect(screen.getByText('Create your first automation')).toBeDefined();
    });

    expect(
      screen.getByText(
        'Automatically handle customer conversations, follow-ups, lead qualification, and repetitive business tasks.'
      )
    ).toBeDefined();
  });

  // ==========================================================================
  // 3. SEARCH & DEBOUNCING
  // ==========================================================================
  it('should filter automations by search input', async () => {
    render(<ProjectAutomationsPage />);

    await waitFor(() => {
      expect(screen.getAllByText('Welcome Onboarding Flow').length).toBeGreaterThan(0);
    });

    const searchInput = screen.getByPlaceholderText('Search automations, workflows...');
    fireEvent.change(searchInput, { target: { value: 'Cart' } });

    await waitFor(() => {
      expect(screen.getAllByText('Abandoned Cart Followup').length).toBeGreaterThan(0);
      expect(screen.queryAllByText('Welcome Onboarding Flow')).toHaveLength(0);
    }, { timeout: 2000 });
  });

  // ==========================================================================
  // 4. STATUS FILTER TABS
  // ==========================================================================
  it('should filter automations by status tab (Active, Draft, Paused, Archived)', async () => {
    render(<ProjectAutomationsPage />);

    await waitFor(() => {
      expect(screen.getAllByText('Welcome Onboarding Flow').length).toBeGreaterThan(0);
    });

    // Click 'Draft' filter tab
    const draftTab = screen.getByRole('button', { name: /^Draft$/i });
    fireEvent.click(draftTab);

    await waitFor(() => {
      expect(screen.getAllByText('Abandoned Cart Followup').length).toBeGreaterThan(0);
    });

    expect(screen.queryByText('Welcome Onboarding Flow')).toBeNull();

    // Click 'Archived' tab
    const archivedTab = screen.getByRole('button', { name: /^Archived$/i });
    fireEvent.click(archivedTab);

    await waitFor(() => {
      expect(screen.getAllByText('Legacy Promo Workflow').length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // 5. PAGINATION
  // ==========================================================================
  it('should display pagination controls when records exist', async () => {
    render(<ProjectAutomationsPage />);

    await waitFor(() => {
      expect(screen.getByText(/Showing/i)).toBeDefined();
    });

    expect(screen.getByText(/Page 1 of 1/i)).toBeDefined();
    expect(screen.getByLabelText('Previous page')).toBeDefined();
    expect(screen.getByLabelText('Next page')).toBeDefined();
  });

  // ==========================================================================
  // 6. PERMISSIONS & ROLE CONTROLS
  // ==========================================================================
  it('should hide create button and modification actions when user is VIEWER role', async () => {
    mockFetch.mockImplementation(async (url: string) => {
      const u = typeof url === 'string' ? url : (url as any).url;
      if (u.includes('/api/projects/project-123') && !u.includes('/automations')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            status: 'ok',
            data: { id: 'project-123', name: 'View Only Project', userRole: 'viewer' },
          }),
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          status: 'ok',
          data: mockAutomations,
          totalCount: mockAutomations.length,
        }),
      };
    });

    render(<ProjectAutomationsPage />);

    await waitFor(() => {
      expect(screen.getByText(/Read-Only Access \(VIEWER\)/i)).toBeDefined();
    });

    // + Create Automation button should be hidden for viewers
    expect(screen.queryByText('+ Create Automation')).toBeNull();
  });

  // ==========================================================================
  // 7. OPEN WORKFLOW
  // ==========================================================================
  it('should navigate to automation detail/editor on row click or open', async () => {
    render(<ProjectAutomationsPage />);

    await waitFor(() => {
      expect(screen.getAllByText('Welcome Onboarding Flow').length).toBeGreaterThan(0);
    });

    const openLinks = screen.getAllByTitle('Open workflow');
    expect(openLinks.length).toBeGreaterThan(0);
    expect(openLinks[0].getAttribute('href')).toContain('/projects/project-123/automations/auto-001');
  });

  // ==========================================================================
  // 8. ACTIVATE WORKFLOW
  // ==========================================================================
  it('should activate an automation workflow', async () => {
    render(<ProjectAutomationsPage />);

    await waitFor(() => {
      expect(screen.getAllByText('Abandoned Cart Followup').length).toBeGreaterThan(0);
    });

    // Open action menu for draft item
    const moreButtons = screen.getAllByTitle('More actions');
    fireEvent.click(moreButtons[1]); // Second item is DRAFT

    await waitFor(() => {
      expect(screen.getByRole('menuitem', { name: /activate/i })).toBeDefined();
    });

    const activateBtn = screen.getByRole('menuitem', { name: /activate/i });
    fireEvent.click(activateBtn);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/projects/project-123/automations/auto-002/activate'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  // ==========================================================================
  // 9. PAUSE WORKFLOW
  // ==========================================================================
  it('should pause an active automation workflow', async () => {
    render(<ProjectAutomationsPage />);

    await waitFor(() => {
      expect(screen.getAllByText('Welcome Onboarding Flow').length).toBeGreaterThan(0);
    });

    // First item is ACTIVE
    const moreButtons = screen.getAllByTitle('More actions');
    fireEvent.click(moreButtons[0]);

    await waitFor(() => {
      expect(screen.getByRole('menuitem', { name: /pause/i })).toBeDefined();
    });

    const pauseBtn = screen.getByRole('menuitem', { name: /pause/i });
    fireEvent.click(pauseBtn);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/projects/project-123/automations/auto-001/pause'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  // ==========================================================================
  // 10. ARCHIVE WORKFLOW
  // ==========================================================================
  it('should open archive modal and confirm archiving of an automation', async () => {
    render(<ProjectAutomationsPage />);

    await waitFor(() => {
      expect(screen.getAllByText('Welcome Onboarding Flow').length).toBeGreaterThan(0);
    });

    const moreButtons = screen.getAllByTitle('More actions');
    fireEvent.click(moreButtons[0]);

    await waitFor(() => {
      expect(screen.getByRole('menuitem', { name: /archive/i })).toBeDefined();
    });

    const archiveBtn = screen.getByRole('menuitem', { name: /archive/i });
    fireEvent.click(archiveBtn);

    // Modal confirmation opens
    await waitFor(() => {
      expect(screen.getByText('Archive Automation?')).toBeDefined();
    });

    const confirmBtn = screen.getByRole('button', { name: /confirm archive/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/projects/project-123/automations/auto-001'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  // ==========================================================================
  // 11. CREATE WORKFLOW MODAL
  // ==========================================================================
  it('should create a new automation through the modal form', async () => {
    render(<ProjectAutomationsPage />);

    await waitFor(() => {
      expect(screen.getByText('+ Create Automation')).toBeDefined();
    });

    const createBtn = screen.getByText('+ Create Automation');
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 3, name: /create automation/i })).toBeDefined();
    });

    const nameInput = screen.getByPlaceholderText('e.g. Lead Qualification Sequence');
    fireEvent.change(nameInput, { target: { value: 'New Test Sequence' } });

    const descInput = screen.getByPlaceholderText('Briefly describe what this workflow accomplishes...');
    fireEvent.change(descInput, { target: { value: 'Test description' } });

    const submitBtn = screen.getByRole('button', { name: /^Create Automation$/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/projects/project-123/automations'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('New Test Sequence'),
        })
      );
    });
  });
});
