import { type NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/app/api/authWrapper';
import { bookingService } from '@/lib/services/bookingService';

export const dynamic = 'force-dynamic';

/**
 * GET /api/bookings
 * Query parameters:
 *  - startDate: string (ISO)
 *  - endDate: string (ISO)
 *  - checkSlot: string (ISO date to test availability)
 */
export const GET = withAuth(async function getBookings(request: NextRequest, session) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = session.workspace.workspaceId;
    const checkSlot = searchParams.get('checkSlot');

    if (checkSlot) {
      const duration = parseInt(searchParams.get('duration') || '30', 10);
      const availability = await bookingService.checkSlotAvailability(workspaceId, checkSlot, duration);
      return NextResponse.json({ status: 'ok', data: availability });
    }

    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const status = searchParams.get('status') || undefined;

    const bookings = await bookingService.getBookings(workspaceId, {
      startDate,
      endDate,
      status,
    });

    return NextResponse.json({ status: 'ok', data: bookings });
  } catch (error) {
    console.error('Error in GET /api/bookings:', error);
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
  }
});

/**
 * POST /api/bookings
 * Body:
 *  - contactName: string
 *  - phoneNumber: string
 *  - contactEmail?: string
 *  - title?: string
 *  - scheduledAt: string (ISO)
 *  - durationMinutes?: number
 *  - autoBookNext?: boolean
 *  - notes?: string
 */
export const POST = withAuth(async function createBooking(request: NextRequest, session) {
  try {
    const body = await request.json();
    const workspaceId = session.workspace.workspaceId;
    const userId = session.workspace.userId;

    const {
      contactName,
      phoneNumber,
      contactEmail,
      title = 'Product Demo & Meeting',
      scheduledAt,
      durationMinutes = 30,
      autoBookNext = true,
      bookedBy = 'manual',
      notes,
    } = body;

    if (!contactName || !phoneNumber || !scheduledAt) {
      return NextResponse.json(
        { error: 'contactName, phoneNumber, and scheduledAt are required' },
        { status: 400 },
      );
    }

    const result = await bookingService.createBooking({
      workspaceId,
      userId,
      contactName,
      phoneNumber,
      contactEmail,
      title,
      scheduledAt,
      durationMinutes,
      bookedBy,
      autoBookNext,
      notes,
    });

    return NextResponse.json({
      status: result.success ? 'ok' : 'conflict',
      data: result,
    });
  } catch (error) {
    console.error('Error in POST /api/bookings:', error);
    return NextResponse.json({ error: 'Failed to process booking' }, { status: 500 });
  }
});
