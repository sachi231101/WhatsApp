import { type NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/app/api/authWrapper';
import { bookingService } from '@/lib/services/bookingService';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/bookings/[id]
 * Cancels a booking
 */
export const DELETE = withAuth(async function deleteBooking(
  request: NextRequest,
  session,
) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split('/');
    const id = segments[segments.length - 1];

    if (!id) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 });
    }

    const workspaceId = session.workspace.workspaceId;
    const success = await bookingService.cancelBooking(workspaceId, id);

    if (!success) {
      return NextResponse.json({ error: 'Booking not found or could not be cancelled' }, { status: 404 });
    }

    return NextResponse.json({ status: 'ok', message: 'Booking cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    return NextResponse.json({ error: 'Failed to cancel booking' }, { status: 500 });
  }
});
