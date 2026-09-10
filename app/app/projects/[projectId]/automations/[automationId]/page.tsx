import { redirect } from 'next/navigation';

export default async function AppProjectAutomationDetailRedirect({
  params,
}: {
  params: Promise<{ projectId: string; automationId: string }>;
}) {
  const { projectId, automationId } = await params;
  redirect(`/projects/${projectId}/automations/${automationId}`);
}
