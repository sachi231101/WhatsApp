import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';

export const metadata = {
  title: 'Platform Administration Console — Wazzi App',
  description: 'Manage Meta WhatsApp Business Accounts, webhooks, and infrastructure.',
};

export default async function AdminHomePage() {
  const user = await getSessionUser();

  if (!user) {
    redirect('/admin/login');
  }

  if (user.role !== 'admin' && !user.isSuperAdmin) {
    redirect('/dashboard');
  }

  redirect('/admin/dashboard');
}
