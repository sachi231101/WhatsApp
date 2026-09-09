'use client';

import { Suspense } from 'react';
import CreateCampaignPage from '../../create/page';

export default function TemplateCreateRoute() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-gray-500">Loading template creator...</div>}>
      <CreateCampaignPage />
    </Suspense>
  );
}
