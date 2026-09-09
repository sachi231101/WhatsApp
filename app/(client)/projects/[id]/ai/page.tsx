'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function ProjectAIRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  useEffect(() => {
    if (projectId) {
      router.replace(`/projects/${projectId}/ai/agents`);
    }
  }, [projectId, router]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-12">
      <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
      <p className="text-sm font-semibold text-gray-700">Loading AI Studio...</p>
    </div>
  );
}
