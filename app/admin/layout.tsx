import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Login/register pages should render without admin shell - detect via child path isn't possible here,
  // so we check session and allow unauthenticated access to auth pages via middleware;
  // shell will still render for /admin root which handles its own redirect.
  // Use a client-side wrapper for auth pages to hide shell — here we always show shell and
  // let /admin/login page hide it with its own full-screen design via internal check.
  const user = await getSessionUser();

  // For login/register, render children full-screen without shell (they have their own dark bg)
  // We detect by trying to see if user missing and path is auth — but layout can't read pathname reliably.
  // Instead always render shell; auth pages will override by rendering full viewport which covers shell.
  // Simpler: if no user, just render children (auth pages)
  if (!user) {
    return <>{children}</>;
  }
  if (user.role !== 'admin' && !user.isSuperAdmin) {
    redirect('/dashboard?error=admin_required');
  }

  return (
    <div className="min-h-screen bg-[#090b10] text-white flex">
      <AdminSidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <AdminHeader />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
