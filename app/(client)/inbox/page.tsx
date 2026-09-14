'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, MessageSquare } from 'lucide-react';

/**
 * Workspace inbox entry — redirects to the default/first project inbox.
 * Demo data has been removed; the project inbox is the production surface.
 */
export default function TeamInboxPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function resolveProject() {
      try {
        const res = await fetch('/api/projects?status=active');
        if (!res.ok) {
          if (!cancelled) setError('Unable to load projects.');
          return;
        }
        const json = await res.json();
        if (json.status === 'ok' && Array.isArray(json.data) && json.data.length > 0) {
          router.replace(`/projects/${json.data[0].id}/inbox`);
          return;
        }
        if (!cancelled) {
          setError('No active project found. Create a project to open the inbox.');
        }
      } catch (err) {
        console.error('Failed to resolve project for inbox:', err);
        if (!cancelled) setError('Unable to open inbox. Please try again.');
      }
    }

    resolveProject();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-[#f8fafc] min-h-[60vh]">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-12 h-12 rounded-2xl bg-gray-100 border border-gray-200 flex items-center justify-center mx-auto text-gray-400">
            <MessageSquare className="w-6 h-6" />
          </div>
          <p className="text-sm text-gray-600">{error}</p>
          <Link
            href="/projects"
            className="inline-flex px-4 py-2 bg-[#1b59f8] hover:bg-blue-700 text-white text-xs font-semibold rounded-xl"
          >
            Go to Projects
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center p-8 bg-[#f8fafc] min-h-[60vh]">
      <div className="flex items-center gap-2 text-gray-500 text-sm font-medium">
        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
        Opening inbox...
      </div>
    </div>
  );
}
