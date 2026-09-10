'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function ProjectKnowledgeRedirect() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  useEffect(() => {
    if (projectId) {
      router.replace(`/projects/${projectId}/ai/knowledge`);
    }
  }, [projectId, router]);

  return (
    <div className="flex-1 flex items-center justify-center p-12">
      <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
    </div>
  );
}
