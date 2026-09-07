import { sql } from '@/lib/db';

export interface DemoBooking {
  id: string;
  workspaceId: string;
  contactId?: string | null;
  contactName: string;
  contactEmail?: string | null;
  phoneNumber: string;
  title: string;
  scheduledAt: string; // ISO string
  durationMinutes: number;
  status: 'confirmed' | 'cancelled' | 'rescheduled' | 'completed';
  bookedBy: 'ai' | 'manual' | 'customer';
  meetLink?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface CreateBookingInput {
  workspaceId: string;
  userId?: string;
  contactId?: string;
  contactName: string;
  contactEmail?: string;
  phoneNumber: string;
  title?: string;
  scheduledAt: Date | string;
  durationMinutes?: number;
  bookedBy?: 'ai' | 'manual' | 'customer';
  meetLink?: string;
  notes?: string;
  autoBookNext?: boolean;
}

export interface SlotAvailabilityResult {
  available: boolean;
  conflictingBooking?: {
    id: string;
    title: string;
    contactName: string;
    scheduledAt: string;
    durationMinutes: number;
  } | null;
}

export interface BookingResult {
  success: boolean;
  booking?: DemoBooking;
  conflict?: boolean;
  conflictResolved?: boolean;
  originalRequestedTime?: string;
  alternativeSlots?: string[];
  message: string;
}

export class BookingService {
  /**
   * Helper to format a Date into readable 12-hour AM/PM string
   */
  private formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  /**
   * Helper to format a Date into readable Date string
   */
  private formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  /**
   * Generates a realistic Google Meet link
   */
  private generateMeetLink(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    const randPart = (len: number) =>
      Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `https://meet.google.com/${randPart(3)}-${randPart(4)}-${randPart(3)}`;
  }

  /**
   * Retrieves bookings for a workspace, optionally filtered by date range or month
   */
  async getBookings(
    workspaceId: string,
    options?: {
      startDate?: Date | string;
      endDate?: Date | string;
      status?: string;
    },
  ): Promise<DemoBooking[]> {
    try {
      let rows: any[] = [];

      if (options?.startDate && options?.endDate) {
        const start = new Date(options.startDate).toISOString();
        const end = new Date(options.endDate).toISOString();
        const res = await sql`
          SELECT 
            id,
            workspace_id as "workspaceId",
            contact_id as "contactId",
            contact_name as "contactName",
            contact_email as "contactEmail",
            phone_number as "phoneNumber",
            title,
            scheduled_at as "scheduledAt",
            duration_minutes as "durationMinutes",
            status,
            booked_by as "bookedBy",
            meet_link as "meetLink",
            notes,
            created_at as "createdAt"
          FROM demo_bookings
          WHERE workspace_id = ${workspaceId}
            AND scheduled_at >= ${start}
            AND scheduled_at <= ${end}
          ORDER BY scheduled_at ASC
        `;
        rows = res.rows;
      } else if (options?.startDate) {
        const start = new Date(options.startDate).toISOString();
        const res = await sql`
          SELECT 
            id,
            workspace_id as "workspaceId",
            contact_id as "contactId",
            contact_name as "contactName",
            contact_email as "contactEmail",
            phone_number as "phoneNumber",
            title,
            scheduled_at as "scheduledAt",
            duration_minutes as "durationMinutes",
            status,
            booked_by as "bookedBy",
            meet_link as "meetLink",
            notes,
            created_at as "createdAt"
          FROM demo_bookings
          WHERE workspace_id = ${workspaceId}
            AND scheduled_at >= ${start}
          ORDER BY scheduled_at ASC
        `;
        rows = res.rows;
      } else {
        const res = await sql`
          SELECT 
            id,
            workspace_id as "workspaceId",
            contact_id as "contactId",
            contact_name as "contactName",
            contact_email as "contactEmail",
            phone_number as "phoneNumber",
            title,
            scheduled_at as "scheduledAt",
            duration_minutes as "durationMinutes",
            status,
            booked_by as "bookedBy",
            meet_link as "meetLink",
            notes,
            created_at as "createdAt"
          FROM demo_bookings
          WHERE workspace_id = ${workspaceId}
          ORDER BY scheduled_at ASC
        `;
        rows = res.rows;
      }

      if (options?.status) {
        rows = rows.filter((r) => r.status === options.status);
      }

      return (rows || []).map((r) => ({
        id: r.id,
        workspaceId: r.workspaceId,
        contactId: r.contactId,
        contactName: r.contactName,
        contactEmail: r.contactEmail,
        phoneNumber: r.phoneNumber,
        title: r.title,
        scheduledAt: new Date(r.scheduledAt).toISOString(),
        durationMinutes: Number(r.durationMinutes || 30),
        status: r.status,
        bookedBy: r.bookedBy,
        meetLink: r.meetLink,
        notes: r.notes,
        createdAt: new Date(r.createdAt).toISOString(),
      }));
    } catch (err) {
      console.error('Error fetching demo bookings:', err);
      return [];
    }
  }

  /**
   * Checks whether a given slot is available or collides with an existing booking
   */
  async checkSlotAvailability(
    workspaceId: string,
    requestedAt: Date | string,
    durationMinutes: number = 30,
  ): Promise<SlotAvailabilityResult> {
    const slotStart = new Date(requestedAt);
    const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60 * 1000);

    // Look for any existing active booking on the same day that overlaps
    const dayStart = new Date(slotStart);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(slotStart);
    dayEnd.setHours(23, 59, 59, 999);

    const { rows } = await sql`
      SELECT 
        id, 
        title, 
        contact_name, 
        scheduled_at, 
        duration_minutes
      FROM demo_bookings
      WHERE workspace_id = ${workspaceId}
        AND status != 'cancelled'
        AND scheduled_at >= ${dayStart.toISOString()}
        AND scheduled_at <= ${dayEnd.toISOString()}
    `;

    for (const b of rows) {
      const bStart = new Date(b.scheduled_at);
      const bEnd = new Date(bStart.getTime() + (b.duration_minutes || 30) * 60 * 1000);

      // Overlap condition: (slotStart < bEnd) && (bStart < slotEnd)
      if (slotStart < bEnd && bStart < slotEnd) {
        return {
          available: false,
          conflictingBooking: {
            id: b.id,
            title: b.title,
            contactName: b.contact_name,
            scheduledAt: bStart.toISOString(),
            durationMinutes: b.duration_minutes,
          },
        };
      }
    }

    return { available: true };
  }

  /**
   * Automatically searches forward to find the next available slots.
   * Scans 30-min intervals during business hours (9:00 AM - 6:00 PM).
   * If remaining hours of today are full, scans the next day!
   */
  async findNextAvailableSlots(
    workspaceId: string,
    startFrom: Date | string,
    durationMinutes: number = 30,
    count: number = 5,
  ): Promise<string[]> {
    const availableSlots: string[] = [];
    let candidate = new Date(startFrom);

    // Round forward to the nearest 30-minute interval (:00 or :30)
    const minutes = candidate.getMinutes();
    if (minutes > 0 && minutes <= 30) {
      candidate.setMinutes(30, 0, 0);
    } else if (minutes > 30) {
      candidate.setHours(candidate.getHours() + 1, 0, 0, 0);
    } else {
      candidate.setSeconds(0, 0);
    }

    // Business hours constraints (9 AM - 6 PM)
    const BUSINESS_START_HOUR = 9;
    const BUSINESS_END_HOUR = 18;

    let iterations = 0;
    const maxIterations = 48 * 7; // Up to 7 days ahead

    while (availableSlots.length < count && iterations < maxIterations) {
      iterations++;

      const currentHour = candidate.getHours();

      // If before business hours, jump to 9:00 AM
      if (currentHour < BUSINESS_START_HOUR) {
        candidate.setHours(BUSINESS_START_HOUR, 0, 0, 0);
      }
      // If at or past business end hour (6 PM), roll to next day at 9:00 AM
      else if (currentHour >= BUSINESS_END_HOUR) {
        candidate.setDate(candidate.getDate() + 1);
        candidate.setHours(BUSINESS_START_HOUR, 0, 0, 0);
      }

      // Check candidate slot
      const check = await this.checkSlotAvailability(workspaceId, candidate, durationMinutes);
      if (check.available) {
        availableSlots.push(new Date(candidate).toISOString());
      }

      // Advance by durationMinutes (default 30 mins)
      candidate = new Date(candidate.getTime() + durationMinutes * 60 * 1000);
    }

    return availableSlots;
  }

  /**
   * Helper to get a valid user ID for notification dispatch
   */
  private async getNotificationUserId(workspaceId: string, providedUserId?: string): Promise<string | null> {
    if (providedUserId) return providedUserId;
    try {
      const { rows } = await sql`
        SELECT user_id FROM workspace_memberships
        WHERE workspace_id = ${workspaceId}
        ORDER BY created_at ASC
        LIMIT 1
      `;
      if (rows.length > 0) return rows[0].user_id;

      const { rows: fallbackUser } = await sql`SELECT id FROM users LIMIT 1`;
      return fallbackUser.length > 0 ? fallbackUser[0].id : null;
    } catch {
      return null;
    }
  }

  /**
   * Dispatches a team notification to the database
   */
  private async dispatchNotification(
    workspaceId: string,
    userId: string | null,
    title: string,
    message: string,
    category: string = 'demo_booked',
    linkUrl: string = '/dashboard',
  ) {
    if (!userId) return;
    try {
      await sql`
        INSERT INTO notifications (workspace_id, user_id, title, message, category, link_url, is_read)
        VALUES (${workspaceId}, ${userId}, ${title}, ${message}, ${category}, ${linkUrl}, false)
      `;
    } catch (err) {
      console.warn('Failed to insert notification:', err);
    }
  }

  /**
   * Main booking method:
   * 1. Checks availability for requested slot.
   * 2. If available -> books immediately & sends notification.
   * 3. If occupied & autoBookNext -> finds next open slot, books it, and notifies team of the conflict resolution.
   * 4. If occupied & not autoBookNext -> returns conflict with suggestions.
   */
  async createBooking(input: CreateBookingInput): Promise<BookingResult> {
    const {
      workspaceId,
      userId,
      contactId = null,
      contactName,
      contactEmail = null,
      phoneNumber,
      title = 'Product Demo & Meeting',
      scheduledAt,
      durationMinutes = 30,
      bookedBy = 'ai',
      notes = null,
      autoBookNext = true,
    } = input;

    const requestedDate = new Date(scheduledAt);
    const meetLink = input.meetLink || this.generateMeetLink();

    // Check slot availability
    const slotCheck = await this.checkSlotAvailability(workspaceId, requestedDate, durationMinutes);

    // Scenario 1: Slot is available!
    if (slotCheck.available) {
      const { rows } = await sql`
        INSERT INTO demo_bookings (
          workspace_id,
          contact_id,
          contact_name,
          contact_email,
          phone_number,
          title,
          scheduled_at,
          duration_minutes,
          status,
          booked_by,
          meet_link,
          notes
        )
        VALUES (
          ${workspaceId},
          ${contactId},
          ${contactName},
          ${contactEmail},
          ${phoneNumber},
          ${title},
          ${requestedDate.toISOString()},
          ${durationMinutes},
          'confirmed',
          ${bookedBy},
          ${meetLink},
          ${notes}
        )
        RETURNING 
          id,
          workspace_id as "workspaceId",
          contact_id as "contactId",
          contact_name as "contactName",
          contact_email as "contactEmail",
          phone_number as "phoneNumber",
          title,
          scheduled_at as "scheduledAt",
          duration_minutes as "durationMinutes",
          status,
          booked_by as "bookedBy",
          meet_link as "meetLink",
          notes,
          created_at as "createdAt"
      `;

      const booking = rows[0] as DemoBooking;
      const targetUserId = await this.getNotificationUserId(workspaceId, userId);

      await this.dispatchNotification(
        workspaceId,
        targetUserId,
        `📅 New Demo Booked: ${contactName}`,
        `AI scheduled a ${durationMinutes}-min demo with ${contactName} (${phoneNumber}) for ${this.formatDate(requestedDate)} at ${this.formatTime(requestedDate)}.`,
        'demo_booked',
        '/dashboard',
      );

      return {
        success: true,
        booking,
        conflictResolved: false,
        message: `Demo successfully confirmed for ${this.formatDate(requestedDate)} at ${this.formatTime(requestedDate)}.`,
      };
    }

    // Scenario 2: Slot is occupied!
    const conflictBooking = slotCheck.conflictingBooking;
    const requestedFormatted = `${this.formatDate(requestedDate)} at ${this.formatTime(requestedDate)}`;

    if (autoBookNext) {
      // Find next open slots
      const availableSlots = await this.findNextAvailableSlots(
        workspaceId,
        requestedDate,
        durationMinutes,
        3,
      );

      if (availableSlots.length > 0) {
        const nextSlotDate = new Date(availableSlots[0]);
        const nextSlotFormatted = `${this.formatDate(nextSlotDate)} at ${this.formatTime(nextSlotDate)}`;

        const { rows } = await sql`
          INSERT INTO demo_bookings (
            workspace_id,
            contact_id,
            contact_name,
            contact_email,
            phone_number,
            title,
            scheduled_at,
            duration_minutes,
            status,
            booked_by,
            meet_link,
            notes
          )
          VALUES (
            ${workspaceId},
            ${contactId},
            ${contactName},
            ${contactEmail},
            ${phoneNumber},
            ${title},
            ${nextSlotDate.toISOString()},
            ${durationMinutes},
            'confirmed',
            ${bookedBy},
            ${meetLink},
            ${`[AI Auto-Slot Resolution] Original requested slot (${requestedFormatted}) was occupied by "${conflictBooking?.contactName || 'Another Meeting'}". Next available slot booked.` + (notes ? `\n\nNotes: ${notes}` : '')}
          )
          RETURNING 
            id,
            workspace_id as "workspaceId",
            contact_id as "contactId",
            contact_name as "contactName",
            contact_email as "contactEmail",
            phone_number as "phoneNumber",
            title,
            scheduled_at as "scheduledAt",
            duration_minutes as "durationMinutes",
            status,
            booked_by as "bookedBy",
            meet_link as "meetLink",
            notes,
            created_at as "createdAt"
        `;

        const booking = rows[0] as DemoBooking;
        const targetUserId = await this.getNotificationUserId(workspaceId, userId);

        await this.dispatchNotification(
          workspaceId,
          targetUserId,
          `📅 Demo Booked (Alternate Slot): ${contactName}`,
          `Requested slot (${requestedFormatted}) was occupied. AI automatically secured the next open slot on ${nextSlotFormatted}.`,
          'demo_booked',
          '/dashboard',
        );

        return {
          success: true,
          booking,
          conflict: true,
          conflictResolved: true,
          originalRequestedTime: requestedDate.toISOString(),
          alternativeSlots: availableSlots.slice(1),
          message: `The requested slot (${requestedFormatted}) was already booked. AI automatically searched and confirmed the next available slot on ${nextSlotFormatted}!`,
        };
      }
    }

    // If autoBookNext is false or no slots found
    const suggestedSlots = await this.findNextAvailableSlots(
      workspaceId,
      requestedDate,
      durationMinutes,
      4,
    );

    return {
      success: false,
      conflict: true,
      conflictResolved: false,
      alternativeSlots: suggestedSlots,
      message: `The requested slot (${requestedFormatted}) is already occupied. Please select an alternate slot.`,
    };
  }

  /**
   * Cancels a booking
   */
  async cancelBooking(workspaceId: string, bookingId: string): Promise<boolean> {
    try {
      const { rowCount } = await sql`
        UPDATE demo_bookings
        SET status = 'cancelled'
        WHERE id = ${bookingId} AND workspace_id = ${workspaceId}
      `;
      return (rowCount ?? 0) > 0;
    } catch (err) {
      console.error('Failed to cancel booking:', err);
      return false;
    }
  }
}

export const bookingService = new BookingService();
