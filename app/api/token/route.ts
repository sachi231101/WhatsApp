// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import { NextResponse, type NextRequest } from 'next/server';

import { getToken, saveTokens, registerNumber, subscribeWebhook, graphApiEnableCallingWithToken } from '@/app/api/beUtils';
import { wrapFn, skipProm } from '@/app/errorformat';
import { withAuth } from '@/app/api/authWrapper';

import { whatsappConnectionService } from '@/lib/services/whatsapp/connectionService';

export const POST = withAuth(async function exchangeToken(request: NextRequest, session) {
  const user = session.user;

  const userId = user.email;

  const data = await request.json();

  const {
    code,
    waba_id: wabaId,
    waba_ids: rawWabaIds,
    business_id: businessId,
    ad_account_ids: rawAdAccountIds,
    page_ids: rawPageIds,
    dataset_ids: rawDatasetIds,
    catalog_ids: rawCatalogIds,
    instagram_account_ids: rawInstagramAccountIds,
    app_id: appId,
    phone_number_id: phoneNumberId,
    es_option_reg: esOptionReg,
    es_option_sub: esOptionSub,
    es_option_calling: esOptionCalling,
  } = data;

  // Default arrays to [] and construct wabaIds from singular wabaId if needed
  const wabaIds = rawWabaIds || (wabaId ? [wabaId] : []);
  const pageIds = rawPageIds || [];
  const adAccountIds = rawAdAccountIds || [];
  const datasetIds = rawDatasetIds || [];
  const catalogIds = rawCatalogIds || [];
  const instagramAccountIds = rawInstagramAccountIds || [];

  if (!code || typeof code !== 'string') {
    return NextResponse.json({ error: 'Missing or invalid code' }, { status: 400 });
  }
  if (!appId || typeof appId !== 'string') {
    return NextResponse.json({ error: 'Missing or invalid app_id' }, { status: 400 });
  }
  if (!businessId || typeof businessId !== 'string') {
    return NextResponse.json({ error: 'Missing or invalid business_id' }, { status: 400 });
  }

  try {
    const tokenResult = await wrapFn(getToken(code, appId), 'getToken');
    const [{ fun, status, result: tokenValue, error: tokenError }] = tokenResult;

    if (status !== 'completed' || !tokenValue) {
      throw new Error(`getToken ${status}: ${tokenError}`);
    }

    const accessToken = tokenValue as string;

    // Multi-tenant AES-256-GCM encrypted persistence to PostgreSQL
    try {
      for (const currentWabaId of wabaIds) {
        await whatsappConnectionService.connectWaba({
          workspaceId: session.workspace.workspaceId,
          wabaId: currentWabaId,
          businessId,
          name: `WABA ${currentWabaId}`,
          accessToken,
          phoneNumberId: phoneNumberId || undefined,
          displayPhoneNumber: phoneNumberId || undefined,
          isCallingEnabled: Boolean(esOptionCalling),
        });
      }
    } catch (dbErr) {
      console.error('Multi-tenant token persistence warning (non-fatal):', dbErr);
    }

    const operations = await Promise.all([
      wrapFn(
        saveTokens(
          userId || 'default',
          appId,
          businessId,
          pageIds,
          adAccountIds,
          wabaIds,
          datasetIds,
          catalogIds,
          instagramAccountIds,
          accessToken,
        ),
        'saveTokens',
      ),
      esOptionReg && phoneNumberId
        ? wrapFn(registerNumber(phoneNumberId, accessToken), 'registerNumber')
        : skipProm('registerNumber'),
      esOptionSub
        ? wrapFn(subscribeWebhook(accessToken, wabaId), 'subscribeWebhook')
        : skipProm('subscribeWebhook'),
      esOptionCalling && phoneNumberId
        ? wrapFn(graphApiEnableCallingWithToken(phoneNumberId, accessToken), 'enableCalling')
        : skipProm('enableCalling'),
    ]);

    const result = [[{ fun, status, result: '***', error: tokenError }, operations]];
    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to exchange token:', error);
    return NextResponse.json({ error: 'Failed to exchange token' }, { status: 500 });
  }
});
