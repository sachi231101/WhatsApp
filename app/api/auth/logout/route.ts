import { NextRequest, NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/auth/session';

export async function POST(request: NextRequest) {
  const url = new URL('/auth/portal', request.url);
  const response = NextResponse.json({
    success: true,
    redirectUrl: url.toString(),
  });

  clearSessionCookie(response);
  response.cookies.delete('wazzapp_workspace_id');

  return response;
}

export async function GET(request: NextRequest) {
  const url = new URL('/auth/portal', request.url);
  const response = NextResponse.redirect(url);

  clearSessionCookie(response);
  response.cookies.delete('wazzapp_workspace_id');

  return response;
}
