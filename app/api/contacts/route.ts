import { type NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/app/api/authWrapper';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async function getContacts(request: NextRequest, session) {
  try {
    const workspaceId = session.workspace.workspaceId;
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('q') || '';

    let query = sql`
      SELECT id, wa_id, phone_number, first_name, last_name, profile_name, avatar_url, custom_attributes, created_at
      FROM contacts
      WHERE workspace_id = ${workspaceId}
      ORDER BY created_at DESC
    `;

    if (search) {
      const pattern = `%${search}%`;
      query = sql`
        SELECT id, wa_id, phone_number, first_name, last_name, profile_name, avatar_url, custom_attributes, created_at
        FROM contacts
        WHERE workspace_id = ${workspaceId}
          AND (profile_name ILIKE ${pattern} OR phone_number ILIKE ${pattern} OR wa_id ILIKE ${pattern})
        ORDER BY created_at DESC
      `;
    }

    const { rows } = await query;
    return NextResponse.json({ status: 'ok', data: rows });
  } catch (error) {
    console.error('Failed to get contacts:', error);
    return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 });
  }
});

export const POST = withAuth(async function createContact(request: NextRequest, session) {
  try {
    const workspaceId = session.workspace.workspaceId;
    const body = await request.json();
    const { phone_number, first_name, last_name, profile_name, tags = ['Lead'], score = 50 } = body;

    if (!phone_number) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    const cleanPhone = phone_number.replace(/\s+/g, '');
    const fullName = profile_name || [first_name, last_name].filter(Boolean).join(' ') || cleanPhone;
    const customAttributes = {
      stage: 'lead',
      score: Number(score),
      tags: Array.isArray(tags) ? tags : [tags],
    };

    const { rows } = await sql`
      INSERT INTO contacts (
        workspace_id, wa_id, phone_number, first_name, last_name,
        profile_name, custom_attributes
      )
      VALUES (
        ${workspaceId}, ${cleanPhone}, ${cleanPhone}, ${first_name || null}, ${last_name || null},
        ${fullName}, ${JSON.stringify(customAttributes)}
      )
      ON CONFLICT (workspace_id, wa_id) DO UPDATE SET
        profile_name = EXCLUDED.profile_name,
        custom_attributes = EXCLUDED.custom_attributes,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    return NextResponse.json({ status: 'ok', data: rows[0] });
  } catch (error) {
    console.error('Failed to create contact:', error);
    return NextResponse.json({ error: 'Failed to create contact' }, { status: 500 });
  }
});
