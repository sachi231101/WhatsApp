import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NewAutomationPage from '@/app/(client)/projects/[id]/automations/new/page';
import AutomationBuilderPage from '@/app/(client)/projects/[id]/automations/[automationId]/page';
import { automationService } from '@/lib/services/automation';
import {
  AutomationDuplicateNameError,
  AutomationTenantViolationError,
} from '@/lib/services/automation/types';
import { validateCreateAutomation, ValidationError } from '@/lib/services/automation/validation';
import * as auditModule from '@/lib/services/audit/auditLogger';

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

// ── Mock Database Layer for Service-Level Tests ─────────────────────────────
const { mockSql, sqlMockObj } = vi.hoisted(() => {
  const mockFn: any = vi.fn().mockResolvedValue({ rows: [] as any[] });
  mockFn.query = vi.fn().mockResolvedValue({ rows: [] as any[] });
  const obj = Object.assign((...args: any[]) => mockFn(...args), {
    query: (...args: any[]) => mockFn.query(...args),
  });
  return {
    mockSql: mockFn,
    sqlMockObj: obj,
  };
});

vi.mock('@/lib/db', () => ({
  sql: sqlMockObj,
}));

vi.mock('@/lib/auth/context', () => ({
  ensureCoreTables: vi.fn().mockResolvedValue(undefined),
}));

describe('Phase 4: Create Automation', () => {
  let user: ReturnType<typeof userEvent.setup>;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSql.mockReset();
    mockSql.mockResolvedValue({ rows: [] as any[] });
    mockSql.query.mockReset();
    mockSql.query.mockResolvedValue({ rows: [] as any[] });

    user = userEvent.setup();
    mockParams = { id: 'project-123', automationId: 'auto-001' };

    mockFetch = vi.fn(async (url: string, init?: RequestInit) => {
      const u = typeof url === 'string' ? url : (url as any).url;

      // Project Context
      if (u.includes('/api/projects/project-123') && !u.includes('/automations')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            status: 'ok',
            data: { id: 'project-123', name: 'Course Platform', userRole: 'admin' },
          }),
        };
      }

      // Read-only project context
      if (u.includes('/api/projects/project-readonly') && !u.includes('/automations')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            status: 'ok',
            data: { id: 'project-readonly', name: 'Viewer Project', userRole: 'viewer' },
          }),
        };
      }

      // GET single automation (for builder page)
      if (u.includes('/api/projects/project-123/automations/auto-001') && (!init || !init.method || init.method === 'GET')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            status: 'ok',
            data: {
              id: 'auto-001',
              workspaceId: 'ws-123',
              projectId: 'project-123',
              name: 'Course Inquiry Automation',
              description: 'Handles incoming course questions from prospective students.',
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
              nodeCount: 0,
              triggerType: null as string | null,
            },
          }),
        };
      }

      // POST Create Automation
      if (u.includes('/api/projects/project-123/automations') && init?.method === 'POST') {
        const body = JSON.parse((init.body as string) || '{}');

        // Simulate duplicate name check
        if (body.name?.toLowerCase() === 'existing automation') {
          return {
            ok: false,
            status: 409,
            json: async () => ({
              status: 'error',
              code: 'AUTOMATION_DUPLICATE_NAME',
              error: 'An automation named "Existing Automation" already exists in this project.',
            }),
          };
        }

        // Simulate unauthorized or forbidden
        if (body.name === 'Trigger 403') {
          return {
            ok: false,
            status: 403,
            json: async () => ({
              status: 'error',
              error: 'Forbidden: Insufficient permissions for this action',
            }),
          };
        }

        // Successful creation
        return {
          ok: true,
          status: 201,
          json: async () => ({
            status: 'ok',
            data: {
              automation: {
                id: 'auto-new-999',
                workspaceId: 'ws-123',
                projectId: 'project-123',
                name: body.name,
                description: (body.description || null) as string | null,
                status: 'DRAFT',
                currentVersionId: 'ver-new-999',
              },
              draftVersion: {
                id: 'ver-new-999',
                automationId: 'auto-new-999',
                versionNumber: 1,
                status: 'DRAFT',
              },
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
  // 1. FORM RENDERING & DEFAULT STATE
  // ==========================================================================
  describe('Form Rendering & Default State', () => {
    it('should render the Create Automation form with correct headers, labels, and placeholders', async () => {
      render(<NewAutomationPage />);

      expect(screen.getByRole('heading', { name: /create automation/i })).toBeDefined();
      expect(
        screen.getByText('Configure initial details for your new automation workflow.')
      ).toBeDefined();

      const nameInput = screen.getByLabelText(/automation name/i) as HTMLInputElement;
      expect(nameInput).toBeDefined();
      expect(nameInput.placeholder).toBe('Course Inquiry Automation');

      const descInput = screen.getByLabelText(/description/i) as HTMLTextAreaElement;
      expect(descInput).toBeDefined();
      expect(descInput.placeholder).toContain('Describe what triggers this workflow');

      // Default state info card
      expect(screen.getByText(/default workflow state/i)).toBeDefined();
      expect(screen.getByText(/initial status: draft/i)).toBeDefined();
      expect(screen.getByText(/initial version: v1 \(draft\)/i)).toBeDefined();

      // Submit button
      expect(screen.getByRole('button', { name: /create automation/i })).toBeDefined();
    });

    it('should display character counters for name and description', async () => {
      render(<NewAutomationPage />);

      expect(screen.getByText('0/255')).toBeDefined();
      expect(screen.getByText('0/2000')).toBeDefined();

      const nameInput = screen.getByLabelText(/automation name/i);
      fireEvent.change(nameInput, { target: { value: 'Course Inquiry Automation' } });

      expect(screen.getByText(`${'Course Inquiry Automation'.length}/255`)).toBeDefined();
    });
  });

  // ==========================================================================
  // 2. CLIENT VALIDATION
  // ==========================================================================
  describe('Client Validation', () => {
    it('should display validation error when name is empty or whitespace only', async () => {
      render(<NewAutomationPage />);

      const nameInput = screen.getByLabelText(/automation name/i);
      fireEvent.change(nameInput, { target: { value: '   ' } });
      fireEvent.blur(nameInput);

      await waitFor(() => {
        expect(screen.getByText('Automation name is required')).toBeDefined();
      });

      const submitBtn = screen.getByRole('button', { name: /create automation/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText('Please provide a name for your automation.')).toBeDefined();
      });

      // Fetch should not have been called for automation creation
      expect(mockFetch).not.toHaveBeenCalledWith(
        expect.stringContaining('/automations'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should display validation error when name is shorter than 2 characters', async () => {
      render(<NewAutomationPage />);

      const nameInput = screen.getByLabelText(/automation name/i);
      fireEvent.change(nameInput, { target: { value: 'A' } });
      fireEvent.blur(nameInput);

      await waitFor(() => {
        expect(screen.getByText('Automation name must be at least 2 characters')).toBeDefined();
      });

      const submitBtn = screen.getByRole('button', { name: /create automation/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText('Automation name must be at least 2 characters long.')).toBeDefined();
      });

      expect(mockFetch).not.toHaveBeenCalledWith(
        expect.stringContaining('/automations'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  // ==========================================================================
  // 3. ROLE PERMISSIONS & ACCESS CONTROL
  // ==========================================================================
  describe('Role Permissions', () => {
    it('should disable creation and show warning banner when user has read-only role', async () => {
      mockParams = { id: 'project-readonly', automationId: 'auto-001' };
      render(<NewAutomationPage />);

      await waitFor(() => {
        expect(screen.getByText(/read-only permission/i)).toBeDefined();
      });

      const nameInput = screen.getByLabelText(/automation name/i);
      expect((nameInput as HTMLInputElement).disabled).toBe(true);

      const submitBtn = screen.getByRole('button', { name: /create automation/i });
      expect((submitBtn as HTMLButtonElement).disabled).toBe(true);
    });
  });

  // ==========================================================================
  // 4. SUBMISSION FLOW & ERROR HANDLING
  // ==========================================================================
  describe('Submission Flow & Error Handling', () => {
    it('should handle duplicate automation name with friendly error message (409)', async () => {
      render(<NewAutomationPage />);

      const nameInput = screen.getByLabelText(/automation name/i);
      fireEvent.change(nameInput, { target: { value: 'Existing Automation' } });

      const submitBtn = screen.getByRole('button', { name: /create automation/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(
          screen.getByText(/an automation named "existing automation" already exists in this project/i)
        ).toBeDefined();
      });

      expect(mockPush).not.toHaveBeenCalled();
    });

    it('should handle 403 Forbidden with friendly error message', async () => {
      render(<NewAutomationPage />);

      const nameInput = screen.getByLabelText(/automation name/i);
      fireEvent.change(nameInput, { target: { value: 'Trigger 403' } });

      const submitBtn = screen.getByRole('button', { name: /create automation/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(
          screen.getByText(/forbidden: you do not have sufficient permissions/i)
        ).toBeDefined();
      });

      expect(mockPush).not.toHaveBeenCalled();
    });

    it('should successfully submit valid automation and redirect to builder view', async () => {
      render(<NewAutomationPage />);

      const nameInput = screen.getByLabelText(/automation name/i);
      fireEvent.change(nameInput, { target: { value: '  Course Inquiry Automation  ' } });

      const descInput = screen.getByLabelText(/description/i);
      fireEvent.change(descInput, { target: { value: 'Handles new student inquiries' } });

      const submitBtn = screen.getByRole('button', { name: /create automation/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/projects/project-123/automations'),
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({
              name: 'Course Inquiry Automation',
              description: 'Handles new student inquiries',
            }),
          })
        );
      });

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/projects/project-123/automations/auto-new-999');
      });
    });
  });

  // ==========================================================================
  // 5. BUILDER VIEW EMPTY WORKFLOW STATE
  // ==========================================================================
  describe('Builder View Empty Workflow State', () => {
    it('should render the builder with empty workflow canvas and draft status', async () => {
      mockParams = { id: 'project-123', automationId: 'auto-001' };
      render(<AutomationBuilderPage />);

      await waitFor(() => {
        expect(screen.getByText('Course Inquiry Automation')).toBeDefined();
      });

      // Status pill & version pill
      expect(screen.getByText('DRAFT')).toBeDefined();
      expect(screen.getByText('v1 (Draft)')).toBeDefined();

      // Empty workflow canvas state
      expect(
        screen.getByText('Drag a node here or add your first trigger')
      ).toBeDefined();
      expect(
        screen.getByText(/this automation currently has no configured workflow nodes/i)
      ).toBeDefined();

      // Add trigger CTA
      expect(screen.getByRole('button', { name: /\+ add trigger node/i })).toBeDefined();
    });
  });

  // ==========================================================================
  // 6. SERVER-SIDE SERVICE & DOMAIN VALIDATION
  // ==========================================================================
  describe('Server-Side Service & Domain Layer', () => {
    it('should validate creation payload schema and reject short names', () => {
      expect(() => validateCreateAutomation({ name: ' ' })).toThrow(ValidationError);
      expect(() => validateCreateAutomation({ name: 'A' })).toThrow(
        /at least 2 characters/i
      );
      expect(() => validateCreateAutomation({ name: 'Valid Name', description: 'x'.repeat(2001) })).toThrow(
        /cannot exceed 2000 characters/i
      );

      const valid = validateCreateAutomation({
        name: '  Lead Qualifier  ',
        description: '  Qualifies inbound leads  ',
      });
      expect(valid.name).toBe('Lead Qualifier');
      expect(valid.description).toBe('Qualifies inbound leads');
    });

    it('should reject creation without workspaceId or projectId in service', async () => {
      await expect(
        automationService.createAutomation({
          workspaceId: '',
          projectId: 'project-123',
          name: 'Invalid Scope Automation',
        })
      ).rejects.toThrow(AutomationTenantViolationError);

      await expect(
        automationService.createAutomation({
          workspaceId: 'ws-123',
          projectId: '',
          name: 'Invalid Scope Automation',
        })
      ).rejects.toThrow(AutomationTenantViolationError);
    });

    it('should reject creation when duplicate active/draft automation exists in project', async () => {
      // Mock existing row in database
      mockSql.mockResolvedValueOnce({
        rows: [{ id: 'auto-existing-1' }],
      });

      await expect(
        automationService.createAutomation({
          workspaceId: 'ws-123',
          projectId: 'project-123',
          name: 'Existing Flow',
        })
      ).rejects.toThrow(AutomationDuplicateNameError);
    });

    it('should execute within a database transaction and record audit logs on success', async () => {
      const recordAuditSpy = vi.spyOn(auditModule, 'recordAuditLog').mockResolvedValue(undefined as any);

      // Mock 0 duplicate rows
      mockSql.mockResolvedValueOnce({ rows: [] });

      // Mock INSERT automation
      mockSql.mockResolvedValueOnce({
        rows: [
          {
            id: 'auto-100',
            workspace_id: 'ws-123',
            project_id: 'project-123',
            name: 'Transactional Flow',
            description: null,
            status: 'DRAFT',
            created_by: 'user-1',
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      });

      // Mock INSERT initial draft version 1
      mockSql.mockResolvedValueOnce({
        rows: [
          {
            id: 'ver-100',
            automation_id: 'auto-100',
            version_number: 1,
            status: 'DRAFT',
            created_by: 'user-1',
            created_at: new Date(),
          },
        ],
      });

      // Mock UPDATE automations current_version_id
      mockSql.mockResolvedValueOnce({ rows: [] });

      const result = await automationService.createAutomation({
        workspaceId: 'ws-123',
        projectId: 'project-123',
        name: 'Transactional Flow',
        userId: 'user-1',
      });

      expect(result.automation.id).toBe('auto-100');
      expect(result.automation.status).toBe('DRAFT');
      expect(result.draftVersion.versionNumber).toBe(1);
      expect(result.draftVersion.status).toBe('DRAFT');

      // Verify BEGIN and COMMIT were called
      expect((mockSql as any).query).toHaveBeenCalledWith('BEGIN');
      expect((mockSql as any).query).toHaveBeenCalledWith('COMMIT');

      // Verify both audit logs were recorded
      expect(recordAuditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'automation.created',
          entityType: 'automation',
          entityId: 'auto-100',
        })
      );

      expect(recordAuditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'automation.version.created',
          entityType: 'automation_version',
          entityId: 'ver-100',
        })
      );
    });

    it('should roll back database transaction if an error occurs during version creation', async () => {
      // Mock 0 duplicate rows
      mockSql.mockResolvedValueOnce({ rows: [] });

      // Mock INSERT automation success
      mockSql.mockResolvedValueOnce({
        rows: [
          {
            id: 'auto-200',
            workspace_id: 'ws-123',
            project_id: 'project-123',
            name: 'Failing Flow',
            status: 'DRAFT',
          },
        ],
      });

      // Mock INSERT version failure
      mockSql.mockRejectedValueOnce(new Error('DB version insert failed'));

      await expect(
        automationService.createAutomation({
          workspaceId: 'ws-123',
          projectId: 'project-123',
          name: 'Failing Flow',
        })
      ).rejects.toThrow('DB version insert failed');

      expect((mockSql as any).query).toHaveBeenCalledWith('BEGIN');
      expect((mockSql as any).query).toHaveBeenCalledWith('ROLLBACK');
    });
  });
});
