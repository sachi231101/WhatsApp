import { projectService } from '@/lib/services/tenants/projectService';
import type { ProjectRecord } from '@/lib/services/tenants/projectService';

/**
 * Resolves the workspace's default/first active project, auto-provisioning if needed.
 * Used by Settings → WhatsApp development connection (project-scoped messaging).
 */
export async function resolveDefaultWorkspaceProject(workspaceId: string): Promise<ProjectRecord> {
  let projects = await projectService.getWorkspaceProjects(workspaceId, { status: 'active' });

  if (projects.length === 0) {
    const defaultProject = await projectService.ensureDefaultProject(workspaceId, 'Default Project');
    projects = [defaultProject];
  }

  return projects[0];
}
