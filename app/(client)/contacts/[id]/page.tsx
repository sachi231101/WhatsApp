'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Users } from 'lucide-react';

export default function ContactDetailsRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const contactId = params.id as string;
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function resolveProject() {
      try {
        const res = await fetch('/api/projects?status=active');
        if (res.ok) {
          const json = await res.json();
          if (json.status === 'ok' && Array.isArray(json.data) && json.data.length > 0) {
            router.replace(`/projects/${json.data[0].id}/contacts/${contactId}`);
            return;
          }
        }
      } catch (err) {
        console.error('Failed to resolve project for contact:', err);
      } finally {
        setLoading(false);
      }
    }
    resolveProject();
  }, [router, contactId]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
        <p className="text-sm font-semibold text-gray-700">Loading contact...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 sm:p-8 max-w-4xl mx-auto w-full">
      <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-2xs text-center">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-4">
          <Users className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-extrabold text-gray-900 mb-2">Project Scoped Contact</h2>
        <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">
          Contacts belong to specific projects. Please navigate to the appropriate project to view this Customer 360 profile.
        </p>
        <Link
          href="/projects"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1b59f8] text-white text-xs font-bold hover:bg-blue-600 transition-colors shadow-md shadow-blue-500/20"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Go to Projects</span>
        </Link>
      </div>
    </div>
  );
}
