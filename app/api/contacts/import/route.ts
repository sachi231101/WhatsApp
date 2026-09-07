import { type NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/app/api/authWrapper';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

export interface ImportContactItem {
  phoneNumber: string;
  name?: string;
  profileName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  tag?: string;
  tags?: string[];
  customAttributes?: Record<string, any>;
}

export const POST = withAuth(async function importContacts(request: NextRequest, session) {
  try {
    const workspaceId = session.workspace.workspaceId;
    const body = await request.json();
    const { contacts: rawContacts, defaultTag = 'Imported Lead' } = body;

    if (!Array.isArray(rawContacts) || rawContacts.length === 0) {
      return NextResponse.json(
        { error: 'Invalid payload: "contacts" must be a non-empty array' },
        { status: 400 },
      );
    }

    let insertedCount = 0;
    let updatedCount = 0;
    let failedCount = 0;
    const errors: Array<{ row: number; phone?: string; reason: string }> = [];

    for (let i = 0; i < rawContacts.length; i++) {
      const item: ImportContactItem = rawContacts[i];
      const rawPhone = item.phoneNumber ? String(item.phoneNumber).trim() : '';

      // Clean phone to digits only for WhatsApp wa_id
      const cleanPhone = rawPhone.replace(/\D+/g, '');

      if (!cleanPhone || cleanPhone.length < 8) {
        failedCount++;
        errors.push({
          row: i + 1,
          phone: rawPhone,
          reason: 'Phone number must contain at least 8 digits (including country code).',
        });
        continue;
      }

      const fullName =
        item.name ||
        item.profileName ||
        [item.firstName, item.lastName].filter(Boolean).join(' ') ||
        `+${cleanPhone}`;

      // Aggregate tags
      const tagList = Array.isArray(item.tags)
        ? item.tags
        : item.tag
        ? [item.tag]
        : defaultTag
        ? [defaultTag]
        : ['Imported'];

      const customAttrs: Record<string, any> = {
        ...(item.customAttributes || {}),
        tags: tagList,
        stage: 'lead',
        imported_at: new Date().toISOString(),
      };

      if (item.email) {
        customAttrs.email = item.email;
      }

      try {
        const { rows } = await sql`
          INSERT INTO contacts (
            workspace_id, wa_id, phone_number, first_name, last_name,
            profile_name, custom_attributes
          )
          VALUES (
            ${workspaceId},
            ${cleanPhone},
            ${'+' + cleanPhone},
            ${item.firstName || null},
            ${item.lastName || null},
            ${fullName},
            ${JSON.stringify(customAttrs)}
          )
          ON CONFLICT (workspace_id, wa_id) DO UPDATE SET
            profile_name = COALESCE(NULLIF(EXCLUDED.profile_name, ''), contacts.profile_name),
            first_name = COALESCE(EXCLUDED.first_name, contacts.first_name),
            last_name = COALESCE(EXCLUDED.last_name, contacts.last_name),
            custom_attributes = contacts.custom_attributes || EXCLUDED.custom_attributes,
            updated_at = CURRENT_TIMESTAMP
          RETURNING (xmax = 0) AS is_new_insert
        `;

        if (rows.length > 0) {
          if (rows[0].is_new_insert) {
            insertedCount++;
          } else {
            updatedCount++;
          }
        }
      } catch (err: any) {
        console.error(`Error importing row ${i + 1}:`, err);
        failedCount++;
        errors.push({
          row: i + 1,
          phone: cleanPhone,
          reason: err.message || 'Database error during insertion',
        });
      }
    }

    return NextResponse.json({
      status: 'ok',
      data: {
        totalProcessed: rawContacts.length,
        insertedCount,
        updatedCount,
        failedCount,
        errors: errors.slice(0, 10), // Limit error sample to first 10
      },
    });
  } catch (error: any) {
    console.error('Failed to import contacts:', error);
    return NextResponse.json({ error: error.message || 'Failed to process import' }, { status: 500 });
  }
});
