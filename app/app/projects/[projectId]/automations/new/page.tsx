import { redirect } from 'next/navigation';

export default async function AppProjectAutomationsNewRedirect({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  redirect(`/projects/${projectId}/automations/new`);
}
