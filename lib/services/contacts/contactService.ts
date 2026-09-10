import { sql } from '@/lib/db';
import { ensureCoreTables } from '@/lib/auth/context';
import { publishContactEvent } from '@/lib/realtime/ablyPublisher';
import { normalizePhoneNumber, isValidPhoneNumber, isValidEmail, formatDisplayPhoneNumber } from './phoneUtils';

export class ContactNotFoundError extends Error {
  statusCode = 404;
  code = 'CONTACT_NOT_FOUND';
  constructor(message = 'Contact not found.') {
    super(message);
    this.name = 'ContactNotFoundError';
  }
}

export interface ContactRecord {
  id: string;
  workspaceId: string;
  projectId: string;
  waId?: string | null;
  phoneNumber: string;
  displayPhoneNumber?: string;
  firstName?: string | null;
  lastName?: string | null;
  displayName: string;
  avatarUrl?: string | null;
  email?: string | null;
  company?: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED' | 'ARCHIVED';
  leadScore: number;
  source: 'WHATSAPP' | 'IMPORT' | 'MANUAL' | 'CAMPAIGN' | 'WEBSITE' | 'API' | 'AUTOMATION';
  lastActivityAt: string;
  createdAt: string;
  updatedAt: string;
  tags?: Array<{ id: string; name: string; color: string }>;
  primaryPhone?: string;
  primaryEmail?: string;
  isNew?: boolean;
}

export interface GetContactsOptions {
  workspaceId: string;
  projectId: string;
  search?: string;
  filter?: 'all' | 'active' | 'new' | 'high_intent' | 'recently_active' | 'tagged';
  tagId?: string;
  limit?: number;
  offset?: number;
  cursor?: string;
}

export interface CreateContactInput {
  workspaceId: string;
  projectId: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  phone: string;
  email?: string;
  company?: string;
  leadScore?: number;
  source?: 'WHATSAPP' | 'IMPORT' | 'MANUAL' | 'CAMPAIGN' | 'WEBSITE' | 'API' | 'AUTOMATION';
  status?: 'ACTIVE' | 'INACTIVE' | 'BLOCKED' | 'ARCHIVED';
  tagIds?: string[];
  actorId?: string;
  actorName?: string;
}

export interface UpdateContactInput {
  workspaceId: string;
  projectId: string;
  contactId: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  phone?: string;
  email?: string;
  company?: string;
  leadScore?: number;
  status?: 'ACTIVE' | 'INACTIVE' | 'BLOCKED' | 'ARCHIVED';
  actorId?: string;
  actorName?: string;
}

export class ContactService {
  /**
   * List contacts strictly scoped to workspace_id and project_id.
   * Supports server-side search, filtering, and pagination.
   */
  async getContacts(options: GetContactsOptions) {
    await ensureCoreTables();
    const {
      workspaceId,
      projectId,
      search,
      filter = 'all',
      tagId,
      limit = 25,
      offset = 0,
      cursor,
    } = options;

    const pageSize = Math.min(Math.max(1, limit), 100);

    const searchParam = search && search.trim() ? `%${search.trim().toLowerCase()}%` : null;
    const cleanPhone = search ? normalizePhoneNumber(search) : '';
    const phoneSearch = cleanPhone ? `%${cleanPhone}%` : searchParam;
    const tagIdParam = tagId || null;
    const cursorParam = cursor && !isNaN(new Date(cursor).getTime()) ? new Date(cursor).toISOString() : null;

    // Total count query
    const { rows: countRows } = await sql`
      SELECT COUNT(*)::int as total
      FROM contacts c
      WHERE c.workspace_id = ${workspaceId}
        AND c.project_id = ${projectId}
        AND (
          (${filter} = 'active' AND c.status = 'ACTIVE') OR
          (${filter} = 'new' AND c.created_at >= NOW() - INTERVAL '7 days') OR
          (${filter} = 'high_intent' AND c.lead_score >= 70) OR
          (${filter} = 'recently_active' AND c.last_activity_at >= NOW() - INTERVAL '3 days') OR
          (${filter} = 'tagged' AND EXISTS (SELECT 1 FROM contact_tags ct WHERE ct.contact_id = c.id)) OR
          (${filter} = 'all')
        )
        AND (
          ${tagIdParam}::text IS NULL OR
          EXISTS (SELECT 1 FROM contact_tags ct WHERE ct.contact_id = c.id AND ct.tag_id = ${tagIdParam})
        )
        AND (
          ${searchParam}::text IS NULL OR
          LOWER(COALESCE(c.display_name, '')) LIKE ${searchParam} OR
          LOWER(COALESCE(c.first_name, '')) LIKE ${searchParam} OR
          LOWER(COALESCE(c.last_name, '')) LIKE ${searchParam} OR
          LOWER(COALESCE(c.company, '')) LIKE ${searchParam} OR
          LOWER(COALESCE(c.email, '')) LIKE ${searchParam} OR
          c.phone_number LIKE ${phoneSearch}
        )
    `;
    const totalCount = countRows[0]?.total || 0;

    // Contacts query with aggregated tags
    const { rows } = await sql`
      SELECT 
        c.id, c.workspace_id, c.project_id, c.wa_id, c.phone_number,
        c.first_name, c.last_name, c.display_name, c.avatar_url, c.email, c.company,
        c.status, c.lead_score, c.source, c.last_activity_at, c.created_at, c.updated_at,
        COALESCE(
          json_agg(
            json_build_object('id', t.id, 'name', t.name, 'color', t.color)
          ) FILTER (WHERE t.id IS NOT NULL),
          '[]'
        ) as tags
      FROM contacts c
      LEFT JOIN contact_tags ct ON c.id = ct.contact_id
      LEFT JOIN tags t ON ct.tag_id = t.id
      WHERE c.workspace_id = ${workspaceId}
        AND c.project_id = ${projectId}
        AND (
          (${filter} = 'active' AND c.status = 'ACTIVE') OR
          (${filter} = 'new' AND c.created_at >= NOW() - INTERVAL '7 days') OR
          (${filter} = 'high_intent' AND c.lead_score >= 70) OR
          (${filter} = 'recently_active' AND c.last_activity_at >= NOW() - INTERVAL '3 days') OR
          (${filter} = 'tagged' AND EXISTS (SELECT 1 FROM contact_tags ct WHERE ct.contact_id = c.id)) OR
          (${filter} = 'all')
        )
        AND (
          ${tagIdParam}::text IS NULL OR
          EXISTS (SELECT 1 FROM contact_tags ct WHERE ct.contact_id = c.id AND ct.tag_id = ${tagIdParam})
        )
        AND (
          ${searchParam}::text IS NULL OR
          LOWER(COALESCE(c.display_name, '')) LIKE ${searchParam} OR
          LOWER(COALESCE(c.first_name, '')) LIKE ${searchParam} OR
          LOWER(COALESCE(c.last_name, '')) LIKE ${searchParam} OR
          LOWER(COALESCE(c.company, '')) LIKE ${searchParam} OR
          LOWER(COALESCE(c.email, '')) LIKE ${searchParam} OR
          c.phone_number LIKE ${phoneSearch}
        )
        AND (
          ${cursorParam}::timestamptz IS NULL OR
          c.last_activity_at < ${cursorParam}::timestamptz
        )
      GROUP BY c.id
      ORDER BY c.last_activity_at DESC
      LIMIT ${pageSize}
      OFFSET ${offset}
    `;

    const contacts: ContactRecord[] = rows.map((r: any) => ({
      id: r.id,
      workspaceId: r.workspace_id,
      projectId: r.project_id,
      waId: r.wa_id,
      phoneNumber: r.phone_number,
      displayPhoneNumber: formatDisplayPhoneNumber(r.phone_number),
      firstName: r.first_name,
      lastName: r.last_name,
      displayName: r.display_name || [r.first_name, r.last_name].filter(Boolean).join(' ') || r.phone_number,
      avatarUrl: r.avatar_url,
      email: r.email,
      company: r.company,
      status: r.status || 'ACTIVE',
      leadScore: Number(r.lead_score ?? 50),
      source: r.source || 'MANUAL',
      lastActivityAt: r.last_activity_at,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      tags: Array.isArray(r.tags) ? r.tags : typeof r.tags === 'string' ? JSON.parse(r.tags) : [],
    }));

    const nextCursor = contacts.length === pageSize ? contacts[contacts.length - 1].lastActivityAt : null;

    return {
      contacts,
      totalCount,
      nextCursor,
      hasMore: contacts.length === pageSize && offset + pageSize < totalCount,
    };
  }

  /**
   * Retrieve a single contact Customer 360 profile with complete relational data.
   */
  async getContactById(workspaceId: string, projectId: string, contactId: string): Promise<ContactRecord & {
    phoneNumbers: any[];
    emails: any[];
    conversationsCount: number;
    notesCount: number;
  }> {
    await ensureCoreTables();

    // Query contact verifying strict workspace and project scoping
    const { rows } = await sql`
      SELECT 
        c.id, c.workspace_id, c.project_id, c.wa_id, c.phone_number,
        c.first_name, c.last_name, c.display_name, c.avatar_url, c.email, c.company,
        c.status, c.lead_score, c.source, c.last_activity_at, c.created_at, c.updated_at,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object('id', t.id, 'name', t.name, 'color', t.color)
          ) FILTER (WHERE t.id IS NOT NULL),
          '[]'
        ) as tags
      FROM contacts c
      LEFT JOIN contact_tags ct ON c.id = ct.contact_id
      LEFT JOIN tags t ON ct.tag_id = t.id
      WHERE c.id = ${contactId} AND c.workspace_id = ${workspaceId} AND c.project_id = ${projectId}
      GROUP BY c.id
      LIMIT 1
    `;

    if (rows.length === 0) {
      throw new ContactNotFoundError();
    }

    const r = rows[0];

    // Query phone numbers
    const { rows: phoneRows } = await sql`
      SELECT id, phone_number, normalized_phone_number, type, is_primary, verified, created_at
      FROM contact_phone_numbers
      WHERE contact_id = ${contactId}
      ORDER BY is_primary DESC, created_at ASC
    `;

    // Query emails
    const { rows: emailRows } = await sql`
      SELECT id, email, type, is_primary, verified, created_at
      FROM contact_emails
      WHERE contact_id = ${contactId}
      ORDER BY is_primary DESC, created_at ASC
    `;

    // Counts
    const { rows: convCountRows } = await sql`
      SELECT COUNT(*)::int as count FROM conversations 
      WHERE contact_id = ${contactId} AND workspace_id = ${workspaceId} AND project_id = ${projectId}
    `;

    const { rows: noteCountRows } = await sql`
      SELECT COUNT(*)::int as count FROM contact_notes 
      WHERE contact_id = ${contactId} AND workspace_id = ${workspaceId} AND project_id = ${projectId}
    `;

    return {
      id: r.id,
      workspaceId: r.workspace_id,
      projectId: r.project_id,
      waId: r.wa_id,
      phoneNumber: r.phone_number,
      displayPhoneNumber: formatDisplayPhoneNumber(r.phone_number),
      firstName: r.first_name,
      lastName: r.last_name,
      displayName: r.display_name || [r.first_name, r.last_name].filter(Boolean).join(' ') || r.phone_number,
      avatarUrl: r.avatar_url,
      email: r.email,
      company: r.company,
      status: r.status || 'ACTIVE',
      leadScore: Number(r.lead_score ?? 50),
      source: r.source || 'MANUAL',
      lastActivityAt: r.last_activity_at,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      tags: Array.isArray(r.tags) ? r.tags : typeof r.tags === 'string' ? JSON.parse(r.tags) : [],
      phoneNumbers: phoneRows.map((p: any) => ({
        id: p.id,
        phoneNumber: p.phone_number,
        normalizedPhoneNumber: p.normalized_phone_number,
        displayPhoneNumber: formatDisplayPhoneNumber(p.phone_number),
        type: p.type,
        isPrimary: Boolean(p.is_primary),
        verified: Boolean(p.verified),
      })),
      emails: emailRows.map((e: any) => ({
        id: e.id,
        email: e.email,
        type: e.type,
        isPrimary: Boolean(e.is_primary),
        verified: Boolean(e.verified),
      })),
      conversationsCount: convCountRows[0]?.count || 0,
      notesCount: noteCountRows[0]?.count || 0,
    };
  }

  /**
   * Creates a new contact within the authorized project.
   * Enforces deduplication on (project_id + normalized_phone_number).
   */
  async createContact(input: CreateContactInput): Promise<ContactRecord> {
    await ensureCoreTables();
    const {
      workspaceId,
      projectId,
      firstName,
      lastName,
      displayName,
      phone,
      email,
      company,
      leadScore = 50,
      source = 'MANUAL',
      status = 'ACTIVE',
      tagIds = [],
      actorId,
      actorName,
    } = input;

    if (!phone || !phone.trim()) {
      throw new Error('Phone number is required.');
    }

    if (!isValidPhoneNumber(phone)) {
      throw new Error('Please enter a valid phone number with country code (7–15 digits).');
    }

    if (email && email.trim() && !isValidEmail(email)) {
      throw new Error('Please enter a valid email address.');
    }

    const normalizedPhone = normalizePhoneNumber(phone);
    const scoreVal = Math.min(Math.max(0, Number(leadScore) || 50), 100);
    const cleanFirst = firstName?.trim() || null;
    const cleanLast = lastName?.trim() || null;
    const cleanCompany = company?.trim() || null;
    const cleanEmail = email?.trim() || null;
    const computedDisplayName = displayName?.trim() || [cleanFirst, cleanLast].filter(Boolean).join(' ') || formatDisplayPhoneNumber(normalizedPhone);

    // Check for duplicate phone within this project
    const { rows: existingRows } = await sql`
      SELECT c.id, c.display_name
      FROM contacts c
      WHERE c.project_id = ${projectId} 
        AND (
          c.phone_number = ${normalizedPhone} 
          OR EXISTS (
            SELECT 1 FROM contact_phone_numbers cpn 
            WHERE cpn.project_id = ${projectId} AND cpn.normalized_phone_number = ${normalizedPhone}
          )
        )
      LIMIT 1
    `;

    if (existingRows.length > 0) {
      throw new Error(`A contact with phone number ${phone} already exists in this project.`);
    }

    // Insert contact
    const { rows: contactRows } = await sql`
      INSERT INTO contacts (
        workspace_id, project_id, wa_id, phone_number,
        first_name, last_name, display_name, email, company,
        status, lead_score, source, last_activity_at
      )
      VALUES (
        ${workspaceId}, ${projectId}, ${normalizedPhone}, ${normalizedPhone},
        ${cleanFirst}, ${cleanLast}, ${computedDisplayName}, ${cleanEmail}, ${cleanCompany},
        ${status}, ${scoreVal}, ${source}, CURRENT_TIMESTAMP
      )
      RETURNING *
    `;
    const newContact = contactRows[0];

    // Insert primary phone number
    await sql`
      INSERT INTO contact_phone_numbers (
        workspace_id, project_id, contact_id, phone_number, normalized_phone_number,
        type, is_primary, verified
      )
      VALUES (
        ${workspaceId}, ${projectId}, ${newContact.id}, ${phone.trim()}, ${normalizedPhone},
        'mobile', TRUE, FALSE
      )
    `;

    // Insert primary email if provided
    if (cleanEmail) {
      await sql`
        INSERT INTO contact_emails (
          workspace_id, project_id, contact_id, email, type, is_primary, verified
        )
        VALUES (
          ${workspaceId}, ${projectId}, ${newContact.id}, ${cleanEmail}, 'work', TRUE, FALSE
        )
      `;
    }

    // Associate tags if provided
    if (Array.isArray(tagIds) && tagIds.length > 0) {
      for (const tagId of tagIds) {
        await sql`
          INSERT INTO contact_tags (workspace_id, project_id, contact_id, tag_id)
          VALUES (${workspaceId}, ${projectId}, ${newContact.id}, ${tagId})
          ON CONFLICT (contact_id, tag_id) DO NOTHING
        `;
      }
    }

    // Record activity
    await sql`
      INSERT INTO contact_activities (
        workspace_id, project_id, contact_id, type, actor_id, actor_name, description, metadata
      )
      VALUES (
        ${workspaceId}, ${projectId}, ${newContact.id}, 'CONTACT_CREATED',
        ${actorId || null}, ${actorName || 'User'},
        ${`Contact created (${source})`},
        ${JSON.stringify({ source, createdBy: actorName || 'System' })}
      )
    `;

    // Publish Ably Realtime Event
    await publishContactEvent({
      workspaceId,
      projectId,
      event: 'contact.created',
      data: {
        contact: {
          id: newContact.id,
          displayName: computedDisplayName,
          phoneNumber: normalizedPhone,
          status,
          leadScore: scoreVal,
        },
      },
    });

    // Publish Domain Event (Phase 10 Trigger Engine)
    const { publishDomainEvent } = await import('@/lib/events/domainEvent');
    await publishDomainEvent({
      id: `contact-created-${newContact.id}`,
      type: 'contact.created',
      workspaceId,
      projectId,
      occurredAt: new Date().toISOString(),
      payload: {
        contactId: newContact.id,
        source,
        displayName: computedDisplayName,
        phoneNumber: normalizedPhone,
      },
      metadata: { source: actorName || 'user', actorId },
    });

    return {
      id: newContact.id,
      workspaceId: newContact.workspace_id,
      projectId: newContact.project_id,
      waId: newContact.wa_id,
      phoneNumber: newContact.phone_number,
      displayPhoneNumber: formatDisplayPhoneNumber(newContact.phone_number),
      firstName: newContact.first_name,
      lastName: newContact.last_name,
      displayName: newContact.display_name,
      avatarUrl: newContact.avatar_url,
      email: newContact.email,
      company: newContact.company,
      status: newContact.status,
      leadScore: newContact.lead_score,
      source: newContact.source,
      lastActivityAt: newContact.last_activity_at,
      createdAt: newContact.created_at,
      updatedAt: newContact.updated_at,
    };
  }

  /**
   * Updates an existing contact.
   * Strictly verifies tenant and project boundaries.
   * Explicitly disallows changing workspace_id or project_id.
   */
  async updateContact(input: UpdateContactInput): Promise<ContactRecord> {
    await ensureCoreTables();
    const {
      workspaceId,
      projectId,
      contactId,
      firstName,
      lastName,
      displayName,
      phone,
      email,
      company,
      leadScore,
      status,
      actorId,
      actorName,
    } = input;

    // Load existing contact
    const { rows: existingRows } = await sql`
      SELECT * FROM contacts 
      WHERE id = ${contactId} AND workspace_id = ${workspaceId} AND project_id = ${projectId}
      LIMIT 1
    `;

    if (existingRows.length === 0) {
      throw new ContactNotFoundError();
    }
    const current = existingRows[0];

    // Phone validation & normalization if provided
    let normalizedPhone = current.phone_number;
    if (phone !== undefined && phone !== null) {
      if (!isValidPhoneNumber(phone)) {
        throw new Error('Please enter a valid phone number with country code (7–15 digits).');
      }
      normalizedPhone = normalizePhoneNumber(phone);

      // Verify no duplicate phone in this project (excluding this contact)
      const { rows: dupCheck } = await sql`
        SELECT id FROM contacts 
        WHERE project_id = ${projectId} AND phone_number = ${normalizedPhone} AND id != ${contactId}
        LIMIT 1
      `;
      if (dupCheck.length > 0) {
        throw new Error(`Another contact already has the phone number ${phone} in this project.`);
      }

      // Update primary phone number record
      await sql`
        INSERT INTO contact_phone_numbers (
          workspace_id, project_id, contact_id, phone_number, normalized_phone_number,
          type, is_primary, verified
        )
        VALUES (
          ${workspaceId}, ${projectId}, ${contactId}, ${phone.trim()}, ${normalizedPhone},
          'mobile', TRUE, FALSE
        )
        ON CONFLICT DO NOTHING
      `;
      await sql`
        UPDATE contact_phone_numbers
        SET phone_number = ${phone.trim()}, normalized_phone_number = ${normalizedPhone}, updated_at = CURRENT_TIMESTAMP
        WHERE contact_id = ${contactId} AND is_primary = TRUE
      `;
    }

    // Email validation if provided
    let newEmail = current.email;
    if (email !== undefined) {
      const cleanEmail = email?.trim() || null;
      if (cleanEmail && !isValidEmail(cleanEmail)) {
        throw new Error('Please enter a valid email address.');
      }
      newEmail = cleanEmail;

      if (cleanEmail) {
        await sql`
          INSERT INTO contact_emails (
            workspace_id, project_id, contact_id, email, type, is_primary, verified
          )
          VALUES (
            ${workspaceId}, ${projectId}, ${contactId}, ${cleanEmail}, 'work', TRUE, FALSE
          )
          ON CONFLICT DO NOTHING
        `;
        await sql`
          UPDATE contact_emails
          SET email = ${cleanEmail}, updated_at = CURRENT_TIMESTAMP
          WHERE contact_id = ${contactId} AND is_primary = TRUE
        `;
      }
    }

    // Lead score validation and activity tracking
    let newLeadScore = current.lead_score;
    let scoreChanged = false;
    if (leadScore !== undefined && leadScore !== null) {
      const parsedScore = Number(leadScore);
      if (isNaN(parsedScore) || parsedScore < 0 || parsedScore > 100) {
        throw new Error('Lead score must be an integer between 0 and 100.');
      }
      if (parsedScore !== current.lead_score) {
        scoreChanged = true;
        newLeadScore = parsedScore;
      }
    }

    const newFirst = firstName !== undefined ? (firstName?.trim() || null) : current.first_name;
    const newLast = lastName !== undefined ? (lastName?.trim() || null) : current.last_name;
    const newDisplayName = displayName !== undefined
      ? (displayName?.trim() || [newFirst, newLast].filter(Boolean).join(' ') || normalizedPhone)
      : current.display_name;
    const newCompany = company !== undefined ? (company?.trim() || null) : current.company;
    const newStatus = status !== undefined ? status : current.status;

    // Execute update (Notice workspace_id and project_id are NOT touched in SET)
    const { rows: updatedRows } = await sql`
      UPDATE contacts
      SET
        first_name = ${newFirst},
        last_name = ${newLast},
        display_name = ${newDisplayName},
        phone_number = ${normalizedPhone},
        email = ${newEmail},
        company = ${newCompany},
        lead_score = ${newLeadScore},
        status = ${newStatus},
        last_activity_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${contactId} AND workspace_id = ${workspaceId} AND project_id = ${projectId}
      RETURNING *
    `;
    const updated = updatedRows[0];

    // Record score changed activity if applicable
    if (scoreChanged) {
      await sql`
        INSERT INTO contact_activities (
          workspace_id, project_id, contact_id, type, actor_id, actor_name, description, metadata
        )
        VALUES (
          ${workspaceId}, ${projectId}, ${contactId}, 'LEAD_SCORE_CHANGED',
          ${actorId || null}, ${actorName || 'User'},
          ${`Lead score changed from ${current.lead_score} to ${newLeadScore}`},
          ${JSON.stringify({ oldScore: current.lead_score, newScore: newLeadScore })}
        )
      `;
      await publishContactEvent({
        workspaceId,
        projectId,
        event: 'contact.score.updated',
        data: { contactId, oldScore: current.lead_score, newScore: newLeadScore },
      });
    }

    // Record contact updated activity
    await sql`
      INSERT INTO contact_activities (
        workspace_id, project_id, contact_id, type, actor_id, actor_name, description, metadata
      )
      VALUES (
        ${workspaceId}, ${projectId}, ${contactId}, 'CONTACT_UPDATED',
        ${actorId || null}, ${actorName || 'User'},
        ${'Contact details updated'},
        ${JSON.stringify({ updatedFields: Object.keys(input).filter((k) => !['workspaceId', 'projectId', 'contactId', 'actorId', 'actorName'].includes(k)) })}
      )
    `;

    // Publish Ably Realtime Event
    await publishContactEvent({
      workspaceId,
      projectId,
      event: 'contact.updated',
      data: { contactId, updatedFields: input },
    });

    return {
      id: updated.id,
      workspaceId: updated.workspace_id,
      projectId: updated.project_id,
      waId: updated.wa_id,
      phoneNumber: updated.phone_number,
      displayPhoneNumber: formatDisplayPhoneNumber(updated.phone_number),
      firstName: updated.first_name,
      lastName: updated.last_name,
      displayName: updated.display_name,
      avatarUrl: updated.avatar_url,
      email: updated.email,
      company: updated.company,
      status: updated.status,
      leadScore: updated.lead_score,
      source: updated.source,
      lastActivityAt: updated.last_activity_at,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
    };
  }

  /**
   * WhatsApp Inbound Auto-Creation and Deduplication.
   * Matches contact strictly within project by normalized phone number.
   * If found: reuses contact and updates activity timestamp.
   * If not found: creates new contact with source = 'WHATSAPP'.
   */
  async findOrCreateWhatsAppContact(params: {
    workspaceId: string;
    projectId: string;
    waId: string;
    profileName?: string;
  }): Promise<ContactRecord> {
    await ensureCoreTables();
    const { workspaceId, projectId, waId, profileName } = params;

    const normalized = normalizePhoneNumber(waId);
    const fallbackName = profileName?.trim() || formatDisplayPhoneNumber(normalized);

    // Query for existing contact in this project
    const { rows: existingRows } = await sql`
      SELECT 
        c.id, c.workspace_id, c.project_id, c.wa_id, c.phone_number,
        c.first_name, c.last_name, c.display_name, c.avatar_url, c.email, c.company,
        c.status, c.lead_score, c.source, c.last_activity_at, c.created_at, c.updated_at
      FROM contacts c
      WHERE c.project_id = ${projectId}
        AND (
          c.phone_number = ${normalized}
          OR c.wa_id = ${waId}
          OR EXISTS (
            SELECT 1 FROM contact_phone_numbers cpn 
            WHERE cpn.project_id = ${projectId} AND cpn.normalized_phone_number = ${normalized}
          )
        )
      LIMIT 1
    `;

    if (existingRows.length > 0) {
      const existing = existingRows[0];

      // Update last activity and profile name if current display name is just digits
      const shouldUpdateName = (!existing.display_name || existing.display_name === normalized) && profileName;

      await sql`
        UPDATE contacts
        SET 
          last_activity_at = CURRENT_TIMESTAMP,
          display_name = CASE WHEN ${shouldUpdateName} THEN ${profileName} ELSE display_name END,
          wa_id = COALESCE(wa_id, ${waId}),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${existing.id}
      `;

      return {
        id: existing.id,
        workspaceId: existing.workspace_id,
        projectId: existing.project_id,
        waId: existing.wa_id || waId,
        phoneNumber: existing.phone_number,
        displayPhoneNumber: formatDisplayPhoneNumber(existing.phone_number),
        firstName: existing.first_name,
        lastName: existing.last_name,
        displayName: shouldUpdateName ? profileName! : existing.display_name,
        avatarUrl: existing.avatar_url,
        email: existing.email,
        company: existing.company,
        status: existing.status,
        leadScore: existing.lead_score,
        source: existing.source,
        lastActivityAt: new Date().toISOString(),
        createdAt: existing.created_at,
        updatedAt: existing.updated_at,
        isNew: false,
      };
    }

    // Create brand new contact for WhatsApp inbound
    const { rows: newRows } = await sql`
      INSERT INTO contacts (
        workspace_id, project_id, wa_id, phone_number,
        display_name, status, lead_score, source, last_activity_at
      )
      VALUES (
        ${workspaceId}, ${projectId}, ${waId}, ${normalized},
        ${fallbackName}, 'ACTIVE', 50, 'WHATSAPP', CURRENT_TIMESTAMP
      )
      RETURNING *
    `;
    const created = newRows[0];

    // Insert phone record
    await sql`
      INSERT INTO contact_phone_numbers (
        workspace_id, project_id, contact_id, phone_number, normalized_phone_number,
        type, is_primary, verified
      )
      VALUES (
        ${workspaceId}, ${projectId}, ${created.id}, ${waId}, ${normalized},
        'whatsapp', TRUE, TRUE
      )
    `;

    // Record activity
    await sql`
      INSERT INTO contact_activities (
        workspace_id, project_id, contact_id, type, actor_id, actor_name, description, metadata
      )
      VALUES (
        ${workspaceId}, ${projectId}, ${created.id}, 'CONTACT_CREATED',
        NULL, 'WhatsApp',
        ${'Contact automatically created from WhatsApp inbound message'},
        ${JSON.stringify({ waId, profileName })}
      )
    `;

    // Publish Ably Realtime Event
    await publishContactEvent({
      workspaceId,
      projectId,
      event: 'contact.created',
      data: {
        contact: {
          id: created.id,
          displayName: fallbackName,
          phoneNumber: normalized,
          status: 'ACTIVE',
          leadScore: 50,
        },
      },
    });

    // Publish Domain Event for contact.created (Phase 10 Trigger Engine)
    const { publishDomainEvent } = await import('@/lib/events/domainEvent');
    await publishDomainEvent({
      id: `contact-created-${created.id}`,
      type: 'contact.created',
      workspaceId,
      projectId,
      occurredAt: new Date().toISOString(),
      payload: {
        contactId: created.id,
        source: 'WHATSAPP',
        displayName: fallbackName,
        phoneNumber: normalized,
      },
      metadata: { source: 'meta' },
    });

    return {
      id: created.id,
      workspaceId: created.workspace_id,
      projectId: created.project_id,
      waId: created.wa_id,
      phoneNumber: created.phone_number,
      displayPhoneNumber: formatDisplayPhoneNumber(created.phone_number),
      firstName: created.first_name,
      lastName: created.last_name,
      displayName: created.display_name,
      avatarUrl: created.avatar_url,
      email: created.email,
      company: created.company,
      status: created.status,
      leadScore: created.lead_score,
      source: created.source,
      lastActivityAt: created.last_activity_at,
      createdAt: created.created_at,
      updatedAt: created.updated_at,
      isNew: true,
    };
  }

  /**
   * Retrieves chronological activity timeline for Customer 360 profile.
   */
  async getContactActivities(workspaceId: string, projectId: string, contactId: string, limit = 50) {
    await ensureCoreTables();

    // Verify contact belongs to project
    const { rows: contactRows } = await sql`
      SELECT id FROM contacts 
      WHERE id = ${contactId} AND workspace_id = ${workspaceId} AND project_id = ${projectId}
      LIMIT 1
    `;
    if (contactRows.length === 0) {
      throw new ContactNotFoundError();
    }

    const { rows } = await sql`
      SELECT id, workspace_id, project_id, contact_id, type, actor_id, actor_name, description, metadata, created_at
      FROM contact_activities
      WHERE workspace_id = ${workspaceId} AND project_id = ${projectId} AND contact_id = ${contactId}
      ORDER BY created_at DESC
      LIMIT ${Math.min(limit, 100)}
    `;

    return rows.map((r: any) => ({
      id: r.id,
      type: r.type,
      actorId: r.actor_id,
      actorName: r.actor_name || 'System',
      description: r.description,
      metadata: typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata,
      createdAt: r.created_at,
    }));
  }

  /**
   * Retrieves conversation history for this contact in the project.
   */
  async getContactConversations(workspaceId: string, projectId: string, contactId: string) {
    await ensureCoreTables();

    // Verify contact belongs to project
    const { rows: contactRows } = await sql`
      SELECT id FROM contacts 
      WHERE id = ${contactId} AND workspace_id = ${workspaceId} AND project_id = ${projectId}
      LIMIT 1
    `;
    if (contactRows.length === 0) {
      throw new ContactNotFoundError();
    }

    const { rows } = await sql`
      SELECT 
        c.id, c.status, c.channel, c.handling_mode, c.priority,
        c.last_message_at, c.last_message_preview, c.unread_count,
        u.id as assigned_user_id, u.name as assigned_user_name
      FROM conversations c
      LEFT JOIN users u ON c.assigned_user_id = u.id
      WHERE c.workspace_id = ${workspaceId} 
        AND c.project_id = ${projectId} 
        AND c.contact_id = ${contactId}
      ORDER BY c.last_message_at DESC
    `;

    return rows.map((r: any) => ({
      id: r.id,
      status: r.status,
      channel: r.channel,
      handlingMode: r.handling_mode,
      priority: r.priority,
      lastMessageAt: r.last_message_at,
      lastMessagePreview: r.last_message_preview,
      unreadCount: r.unread_count,
      assignedUser: r.assigned_user_id ? { id: r.assigned_user_id, name: r.assigned_user_name } : null,
    }));
  }
}

export const contactService = new ContactService();
