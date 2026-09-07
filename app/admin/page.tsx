import { redirect } from 'next/navigation';
import { auth0 } from '@/lib/auth0';

export default async function AdminRootPage() {
  const session = await auth0.getSession();

  if (!session) {
    redirect('/admin/login');
  }

  if (session.user?.role !== 'admin' && !session.user?.isSuperAdmin) {
    redirect('/dashboard?error=admin_required');
  }

  redirect('/');
}
