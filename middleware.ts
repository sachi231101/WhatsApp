import { NextResponse, type NextRequest } from 'next/server';
import { Auth0Client } from '@auth0/nextjs-auth0/server';

const auth0 = new Auth0Client();

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
  '/app',
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
  '/client/login',
  '/client/register',
  '/login',
  '/register',
  '/admin/login',
  '/admin/register',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Delegate Auth0 specific endpoints (/auth/login, /auth/logout, /auth/callback) to Auth0 SDK
  if (pathname === '/auth/login' || pathname === '/auth/logout' || pathname === '/auth/callback') {
    try {
      return await auth0.middleware(request);
    } catch {
      // Fallback if Auth0 config is not yet filled in dev environment
      return NextResponse.next();
    }
  }

  // 2. Always allow APIs, webhooks, and public static assets
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname === '/privacy' ||
    pathname === '/about' ||
    pathname === '/features' ||
    pathname === '/pricing' ||
    pathname === '/contact'
  ) {
    return NextResponse.next();
  }

  // Session detection (Auth0 cookie or local encrypted session)
  const hasAuth0Session =
    request.cookies.has('appSession') ||
    request.cookies.has('__session') ||
    request.cookies.has('auth0.is.authenticated');
  const hasLocalSession = request.cookies.has('wazzapp_session');
  const hasSession = hasLocalSession || hasAuth0Session;
  const userRole = request.cookies.get('wazzapp_role')?.value; // 'admin' | 'client'
  const hasWorkspace = request.cookies.has('wazzapp_workspace_id');

  // 3. /app prefix redirect to client application paths
  if (pathname === '/app') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  if (pathname.startsWith('/app/')) {
    const targetPath = pathname.replace(/^\/app/, '');
    return NextResponse.redirect(new URL(targetPath || '/dashboard', request.url));
  }

  // 4. Onboarding route protection
  if (pathname === '/onboarding') {
    if (!hasSession) {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    // If user already has an active workspace selected, take them to their app
    if (hasWorkspace) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // 5. If already logged in and visiting login/register pages, redirect to their home
  if (AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    if (hasSession) {
      if (userRole === 'admin') {
        return NextResponse.redirect(new URL('/admin', request.url));
      }
      if (!hasWorkspace) {
        return NextResponse.redirect(new URL('/onboarding', request.url));
      }
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // 6. Check Admin-only routes
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

  // 7. Check Client SaaS routes
  const isClientPath = CLIENT_PATHS.some((prefix) => pathname === prefix || pathname.startsWith(prefix + '/'));
  if (isClientPath) {
    if (!hasSession) {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Authenticated users with no active workspace go to onboarding
    if (!hasWorkspace && userRole !== 'admin') {
      return NextResponse.redirect(new URL('/onboarding', request.url));
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
