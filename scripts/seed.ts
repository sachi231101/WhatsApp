/**
 * scripts/seed.ts
 *
 * Seeds the database with essential data:
 *   - 3 default plans (Starter, Pro, Enterprise)
 *   - Platform admin user (from TP_CONTACT_EMAIL)
 *   - 1 demo tenant + workspace
 *
 * Run: npx tsx scripts/seed.ts
 */

import { Client } from 'pg';
import crypto from 'crypto';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load .env.local
const envLocalPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

// Use unpooled URL for direct TCP connection (works from local machine)
const connectionString =
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.DATABASE_URL;

async function seed() {
  console.log('🌱 Starting database seed...\n');
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    await client.query('BEGIN');

    // ── 1. Plans ───────────────────────────────────────────────────────────────
    console.log('💳 Seeding plans...');
    const plans = [
      {
        name: 'Starter', slug: 'starter',
        description: 'Perfect for small businesses getting started with WhatsApp.',
        price: '0', currency: 'USD', billing_cycle: 'monthly',
        is_popular: false, trial_days: 14, is_trial: false,
        features: JSON.stringify({ whatsapp_numbers: 1, team_members: 3, contacts: 500, monthly_messages: 1000, ai_agents: false, campaigns: false }),
        limits: JSON.stringify({ max_whatsapp_numbers: 1, max_team_members: 3, max_contacts: 500, max_monthly_messages: 1000 }),
      },
      {
        name: 'Pro', slug: 'pro',
        description: 'For growing businesses that need advanced features.',
        price: '49', currency: 'USD', billing_cycle: 'monthly',
        is_popular: true, trial_days: 14, is_trial: false,
        features: JSON.stringify({ whatsapp_numbers: 3, team_members: 10, contacts: 5000, monthly_messages: 10000, ai_agents: true, campaigns: true, automations: true }),
        limits: JSON.stringify({ max_whatsapp_numbers: 3, max_team_members: 10, max_contacts: 5000, max_monthly_messages: 10000 }),
      },
      {
        name: 'Enterprise', slug: 'enterprise',
        description: 'Unlimited power for large businesses and agencies.',
        price: '199', currency: 'USD', billing_cycle: 'monthly',
        is_popular: false, trial_days: 30, is_trial: false,
        features: JSON.stringify({ whatsapp_numbers: -1, team_members: -1, contacts: -1, monthly_messages: -1, ai_agents: true, campaigns: true, automations: true, dedicated_support: true }),
        limits: JSON.stringify({ max_whatsapp_numbers: -1, max_team_members: -1, max_contacts: -1, max_monthly_messages: -1 }),
      },
    ];

    for (const plan of plans) {
      await client.query(
        `INSERT INTO plans (name, slug, description, price, currency, billing_cycle, is_popular, status, visibility, trial_days, is_trial, features, limits, metadata)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'active','public',$8,$9,$10,$11,'{}')
         ON CONFLICT (slug) DO UPDATE SET
           name=EXCLUDED.name, description=EXCLUDED.description, price=EXCLUDED.price,
           status='active', features=EXCLUDED.features, limits=EXCLUDED.limits, updated_at=CURRENT_TIMESTAMP`,
        [plan.name, plan.slug, plan.description, plan.price, plan.currency, plan.billing_cycle, plan.is_popular, plan.trial_days, plan.is_trial, plan.features, plan.limits]
      );
      console.log(`  ✅ Plan "${plan.name}"`);
    }

    // ── 2. Admin User ──────────────────────────────────────────────────────────
    console.log('\n👤 Seeding admin user...');
    const adminEmail = process.env.TP_CONTACT_EMAIL || 'sachingattikatti@gmail.com';
    const adminPassword = process.env.ADMIN_SEED_PASSWORD || 'Admin@123456';
    const adminPasswordHash = hashPassword(adminPassword);
    await client.query(
      `INSERT INTO users (email, name, role, is_super_admin, status, password_hash)
       VALUES ($1, 'Sachin Gattikatti', 'admin', true, 'active', $2)
       ON CONFLICT (email) DO UPDATE SET role='admin', is_super_admin=true, status='active', password_hash=$2, updated_at=CURRENT_TIMESTAMP`,
      [adminEmail, adminPasswordHash]
    );
    console.log(`  ℹ️  Admin password set to: ${adminPassword}`);
    const { rows: adminRows } = await client.query(`SELECT id FROM users WHERE email=$1 LIMIT 1`, [adminEmail]);
    const adminUserId = adminRows[0]?.id;
    console.log(`  ✅ Admin: ${adminEmail} (id: ${adminUserId})`);

    // ── 3. Demo Tenant ─────────────────────────────────────────────────────────
    console.log('\n🏢 Seeding demo tenant + workspace...');

    let tenantId: string;
    const { rows: existingTenants } = await client.query(`SELECT id FROM tenants WHERE slug='demo-business' LIMIT 1`);
    if (existingTenants.length > 0) {
      tenantId = existingTenants[0].id;
      console.log(`  ℹ️  Demo tenant exists (${tenantId})`);
    } else {
      const { rows: tenantRows } = await client.query(
        `INSERT INTO tenants (name, slug, plan, status) VALUES ('Demo Business','demo-business','pro','active') RETURNING id`
      );
      tenantId = tenantRows[0]?.id;
      console.log(`  ✅ Demo tenant created (${tenantId})`);
    }

    let workspaceId: string;
    const { rows: existingWs } = await client.query(`SELECT id FROM workspaces WHERE slug='demo-workspace' LIMIT 1`);
    if (existingWs.length > 0) {
      workspaceId = existingWs[0].id;
      console.log(`  ℹ️  Demo workspace exists (${workspaceId})`);
    } else {
      const { rows: wsRows } = await client.query(
        `INSERT INTO workspaces (tenant_id, name, slug, timezone, status) VALUES ($1,'Main Workspace','demo-workspace','Asia/Kolkata','active') RETURNING id`,
        [tenantId]
      );
      workspaceId = wsRows[0]?.id;
      console.log(`  ✅ Demo workspace created (${workspaceId})`);
    }

    // Link admin user to workspace
    if (adminUserId && workspaceId) {
      await client.query(
        `INSERT INTO workspace_members (workspace_id, user_id, role, status, invitation_status)
         VALUES ($1,$2,'OWNER','active','active')
         ON CONFLICT (workspace_id, user_id) DO NOTHING`,
        [workspaceId, adminUserId]
      );
      console.log(`  ✅ Admin linked to workspace`);
    }

    // ── 4. Trial Subscription ──────────────────────────────────────────────────
    const { rows: proPlan } = await client.query(`SELECT id FROM plans WHERE slug='pro' LIMIT 1`);
    if (proPlan[0]?.id && tenantId) {
      await client.query(
        `INSERT INTO subscriptions (tenant_id, workspace_id, plan_id, status, billing_cycle, trial_start, trial_end, current_period_start, current_period_end)
         VALUES ($1,$2,$3,'trial','monthly',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP + INTERVAL '14 days',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP + INTERVAL '14 days')
         ON CONFLICT DO NOTHING`,
        [tenantId, workspaceId, proPlan[0].id]
      );
      console.log(`\n🔑 Trial subscription created`);
    }

    await client.query('COMMIT');

    // ── Summary ────────────────────────────────────────────────────────────────
    const { rows: [pc] } = await client.query(`SELECT COUNT(*)::int as c FROM plans`);
    const { rows: [uc] } = await client.query(`SELECT COUNT(*)::int as c FROM users`);
    const { rows: [tc] } = await client.query(`SELECT COUNT(*)::int as c FROM tenants`);
    const { rows: [sc] } = await client.query(`SELECT COUNT(*)::int as c FROM subscriptions`);

    console.log(`\n✨ Seed completed!`);
    console.log(`   Plans: ${pc.c}  |  Users: ${uc.c}  |  Tenants: ${tc.c}  |  Subscriptions: ${sc.c}`);
    console.log(`\n🚀 Visit: https://localhost:3000/admin/dashboard\n`);

  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('\n❌ Seed failed:', err.message || err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seed();
