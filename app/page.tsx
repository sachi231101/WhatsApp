// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import ClientDashboard from '@/app/components/ClientDashboard';
import SidebarLayout from '@/app/components/SidebarLayout';
import LoggedOut from '@/app/components/LoggedOut';
import publicConfig from '@/app/publicConfig';
import { getAppDetails } from '@/app/api/beUtils';
import { auth0 } from '@/lib/auth0';

const { appId, publicEsVersions, publicEsFeatureTypes, publicEsFeatureOptions } = publicConfig;

export default async function Home() {
  // Fetch the user session
  const session = await auth0.getSession();

  // If no session, show the logged out component
  if (!session) {
    return <LoggedOut />;
  }

  const userId = session.user.email;
  const appDetails = await getAppDetails(appId);

  // Show a friendly setup page if FB credentials are not configured yet
  if (appDetails._configError) {
    return (
      <main className="min-h-screen bg-[#e8edf2] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-lg p-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">⚙️</span>
            <h1 className="text-xl font-bold text-gray-900">Setup Required</h1>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Your <code className="bg-gray-100 px-1 rounded">.env.local</code> file has placeholder values.
            The app needs a valid <strong>Facebook App ID</strong> and <strong>App Secret</strong> to work.
          </p>
          <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside mb-6">
            <li>Go to <a href="https://developers.facebook.com/apps/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">developers.facebook.com/apps</a></li>
            <li>Create or select your app → <strong>Settings → Basic</strong></li>
            <li>Copy <strong>App ID</strong> and <strong>App Secret</strong></li>
            <li>
              Update <code className="bg-gray-100 px-1 rounded">.env.local</code>:
              <pre className="mt-2 bg-gray-50 border border-gray-200 rounded p-3 text-xs overflow-auto">
{`FB_APP_ID='your_real_app_id_here'
FB_APP_SECRET='your_real_app_secret_here'`}
              </pre>
            </li>
            <li>Restart the dev server: <code className="bg-gray-100 px-1 rounded">npm run dev</code></li>
          </ol>
          <p className="text-xs text-gray-400">Error: Invalid Facebook Application ID (OAuth code 190)</p>
        </div>
      </main>
    );
  }

  const appName = appDetails.name;
  const logoUrl = appDetails.logo_url;
  const tpConfigs = appDetails.config_ids ?? [];

  return (
    <SidebarLayout userId={userId} logoUrl={logoUrl} appName={appName}>
      <ClientDashboard
        appId={appId}
        appName={appName}
        userId={userId}
        tpConfigs={tpConfigs}
        publicEsVersions={publicEsVersions}
        publicEsFeatureTypes={publicEsFeatureTypes}
        publicEsFeatureOptions={publicEsFeatureOptions}
      />
    </SidebarLayout>
  );
}
