import { sql } from '@/lib/db';
import { WORKSPACE_ROLES, type WorkspaceRole } from '@/lib/auth/roles';

export interface WorkspaceMemberRecord {
  id: string;
  workspaceId: string;
  userId: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: WorkspaceRole;
  invitationStatus: string;
  createdAt: Date;
}

export interface AddMemberInput {
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
}

export class MemberService {
  /**
   * Adds or activates a membership in a workspace.
   */
  async addMember(input: AddMemberInput): Promise<WorkspaceMemberRecord> {
    const { rows } = await sql`
      INSERT INTO workspace_memberships (workspace_id, user_id, role, invitation_status)
      VALUES (${input.workspaceId}, ${input.userId}, ${input.role}, 'active')
      ON CONFLICT (workspace_id, user_id)
      DO UPDATE SET role = EXCLUDED.role, invitation_status = 'active', updated_at = CURRENT_TIMESTAMP
      RETURNING id, workspace_id, user_id, role, invitation_status, created_at
    `;

    const m = rows[0];

    // Fetch user details
    const { rows: userRows } = await sql`
      SELECT email, name, avatar_url FROM users WHERE id = ${input.userId} LIMIT 1
    `;
    const u = userRows[0] || {};

    return {
      id: m.id,
      workspaceId: m.workspace_id,
      userId: m.user_id,
      email: u.email || '',
      name: u.name || null,
      avatarUrl: u.avatar_url || null,
      role: m.role as WorkspaceRole,
      invitationStatus: m.invitation_status,
      createdAt: m.created_at,
    };
  }

  /**
   * Retrieves all members of a workspace with their profiles.
   */
  async getWorkspaceMembers(workspaceId: string): Promise<WorkspaceMemberRecord[]> {
    const { rows } = await sql`
      SELECT 
        wm.id, wm.workspace_id, wm.user_id, wm.role, wm.invitation_status, wm.created_at,
        u.email, u.name, u.avatar_url
      FROM workspace_memberships wm
      JOIN users u ON wm.user_id = u.id
      WHERE wm.workspace_id = ${workspaceId}
      ORDER BY 
        CASE 
          WHEN wm.role = 'owner' THEN 1
          WHEN wm.role = 'admin' THEN 2
          WHEN wm.role = 'member' THEN 3
          ELSE 4
        END,
        wm.created_at ASC
    `;

    return rows.map((r: any) => ({
      id: r.id,
      workspaceId: r.workspace_id,
      userId: r.user_id,
      email: r.email,
      name: r.name,
      avatarUrl: r.avatar_url,
      role: r.role as WorkspaceRole,
      invitationStatus: r.invitation_status || 'active',
      createdAt: r.created_at,
    }));
  }

  /**
   * Retrieves a single user's membership in a specific workspace.
   */
  async getMember(workspaceId: string, userId: string): Promise<WorkspaceMemberRecord | null> {
    const { rows } = await sql`
      SELECT 
        wm.id, wm.workspace_id, wm.user_id, wm.role, wm.invitation_status, wm.created_at,
        u.email, u.name, u.avatar_url
      FROM workspace_memberships wm
      JOIN users u ON wm.user_id = u.id
      WHERE wm.workspace_id = ${workspaceId} AND wm.user_id = ${userId}
      LIMIT 1
    `;

    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      workspaceId: r.workspace_id,
      userId: r.user_id,
      email: r.email,
      name: r.name,
      avatarUrl: r.avatar_url,
      role: r.role as WorkspaceRole,
      invitationStatus: r.invitation_status || 'active',
      createdAt: r.created_at,
    };
  }

  /**
   * Updates a member's role. Protects against demoting the last owner.
   */
  async updateMemberRole(workspaceId: string, targetUserId: string, newRole: WorkspaceRole): Promise<WorkspaceMemberRecord> {
    const member = await this.getMember(workspaceId, targetUserId);
    if (!member) {
      throw new Error('Member not found in workspace');
    }

    // Guard: Prevent demoting the last owner
    if (member.role === WORKSPACE_ROLES.OWNER && newRole !== WORKSPACE_ROLES.OWNER) {
      const { rows: ownerCountRows } = await sql`
        SELECT COUNT(*)::int as count 
        FROM workspace_memberships 
        WHERE workspace_id = ${workspaceId} AND role = ${WORKSPACE_ROLES.OWNER}
      `;
      const ownerCount = ownerCountRows[0]?.count ?? 0;
      if (ownerCount <= 1) {
        throw new Error('Cannot demote the last owner of the workspace. Promote another member first.');
      }
    }

    const { rows } = await sql`
      UPDATE workspace_memberships
      SET role = ${newRole}, updated_at = CURRENT_TIMESTAMP
      WHERE workspace_id = ${workspaceId} AND user_id = ${targetUserId}
      RETURNING id, workspace_id, user_id, role, invitation_status, created_at
    `;

    const updated = rows[0];
    return {
      ...member,
      role: updated.role as WorkspaceRole,
    };
  }

  /**
   * Removes a member from a workspace. Protects against removing the last owner.
   */
  async removeMember(workspaceId: string, targetUserId: string): Promise<boolean> {
    const member = await this.getMember(workspaceId, targetUserId);
    if (!member) return false;

    // Guard: Prevent removing the last owner
    if (member.role === WORKSPACE_ROLES.OWNER) {
      const { rows: ownerCountRows } = await sql`
        SELECT COUNT(*)::int as count 
        FROM workspace_memberships 
        WHERE workspace_id = ${workspaceId} AND role = ${WORKSPACE_ROLES.OWNER}
      `;
      const ownerCount = ownerCountRows[0]?.count ?? 0;
      if (ownerCount <= 1) {
        throw new Error('Cannot remove the last owner of the workspace.');
      }
    }

    const { rowCount } = await sql`
      DELETE FROM workspace_memberships 
      WHERE workspace_id = ${workspaceId} AND user_id = ${targetUserId}
    `;

    return (rowCount ?? 0) > 0;
  }
}

export const memberService = new MemberService();
