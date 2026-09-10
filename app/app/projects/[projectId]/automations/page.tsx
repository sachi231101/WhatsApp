import { redirect } from 'next/navigation';

export default async function AppProjectAutomationsRedirect({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  redirect(`/projects/${projectId}/automations`);
}
