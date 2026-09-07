import { NextResponse, type NextRequest } from 'next/server';

// Admin-only paths
const ADMIN_PATHS = [
  '/admin',
  '/my-wabas',
  '/my-webhooks',
  '/my-pages',
  '/my-ad-accounts',
  '/my-datasets',
  '/my-catalogs',
  '/my-instagram-accounts',
  '/paid_messaging',
  '/certificates',
];

// Client SaaS paths
const CLIENT_PATHS = [
  '/dashboard',
  '/inbox',
  '/ai-agents',
  '/contacts',
  '/campaigns',
  '/automations',
  '/templates',
  '/billing',
  '/team',
  '/settings',
  '/projects',
  '/knowledge-base',
];

// Public authentication paths
const AUTH_PATHS = [
  '/auth/portal',
  '/auth/login',
  '/auth/logout',
  '/client/login',
  '/client/register',
  '/login',
  '/register',
  '/admin/login',
  '/admin/register',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow API auth, webhooks, and public static assets
  if (
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/webhooks') ||
    pathname === '/privacy'
  ) {
    return NextResponse.next();
  }

  const hasSession = request.cookies.has('wazzapp_session');
  const userRole = request.cookies.get('wazzapp_role')?.value; // 'admin' | 'client'

  // If already logged in and visiting login/register pages, redirect to their home
  if (AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    if (hasSession) {
      if (userRole === 'admin') {
        return NextResponse.redirect(new URL('/', request.url));
      }
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // Check Admin-only routes
  const isAdminPath = ADMIN_PATHS.some((prefix) => pathname === prefix || pathname.startsWith(prefix + '/'));
  if (isAdminPath) {
    if (!hasSession) {
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    // Block client users from accessing admin routes
    if (userRole !== 'admin') {
      const dashboardUrl = new URL('/dashboard', request.url);
      dashboardUrl.searchParams.set('error', 'admin_required');
      return NextResponse.redirect(dashboardUrl);
    }
    return NextResponse.next();
  }

  // Check Client SaaS routes
  const isClientPath = CLIENT_PATHS.some((prefix) => pathname === prefix || pathname.startsWith(prefix + '/'));
  if (isClientPath) {
    if (!hasSession) {
      const loginUrl = new URL('/client/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    // Authenticated users (clients and admins) are allowed
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
