/**
 * Dedicated Automation Worker Process Entrypoint
 *
 * Runs the BullMQ worker for executing asynchronous automation workflows independently
 * from the Next.js web application server.
 *
 * Usage:
 *   npx tsx workers/automation.worker.ts
 *   npm run worker:automation
 */

import {
  startAutomationWorker,
  stopAutomationWorker,
  getAutomationWorkerHealth,
} from '@/lib/queue/automationExecutionWorker';
import { closeAutomationExecutionQueue } from '@/lib/queue/automationExecutionQueue';
import { closeRedisConnection, isRedisAvailable } from '@/lib/queue/redis';

// 1. Environment and Configuration Pre-flight Validation
function validateEnvironment(): void {
  const missingVars: string[] = [];

  if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
    missingVars.push('DATABASE_URL or POSTGRES_URL');
  }

  if (!isRedisAvailable()) {
    missingVars.push('REDIS_URL or REDIS_HOST');
  }

  if (missingVars.length > 0) {
    console.error(
      `[AutomationWorkerProcess] Fatal: Missing required environment variables:\n  - ${missingVars.join('\n  - ')}`
    );
    process.exit(1);
  }
}

async function main(): Promise<void> {
  console.log('====================================================');
  console.log('  Wazzi App — Automation Execution Worker Process  ');
  console.log('====================================================');

  validateEnvironment();

  const concurrency = parseInt(process.env.AUTOMATION_WORKER_CONCURRENCY || '5', 10);
  console.log(`[AutomationWorkerProcess] Starting worker (concurrency=${concurrency})...`);

  const worker = startAutomationWorker();
  if (!worker) {
    console.error('[AutomationWorkerProcess] Failed to start worker. Exiting.');
    process.exit(1);
  }

  const health = getAutomationWorkerHealth();
  console.log('[AutomationWorkerProcess] Worker is online and listening for jobs:', health);

  // 2. Graceful Shutdown Handling (SIGTERM, SIGINT)
  let isShuttingDown = false;

  const shutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log(`\n[AutomationWorkerProcess] Received ${signal}. Initiating graceful shutdown...`);

    try {
      // 1. Pause and stop BullMQ worker
      console.log('[AutomationWorkerProcess] Halting worker and completing active jobs...');
      await stopAutomationWorker(15000);

      // 2. Close queue instance
      console.log('[AutomationWorkerProcess] Closing BullMQ queue connections...');
      await closeAutomationExecutionQueue();

      // 3. Close Redis connection
      console.log('[AutomationWorkerProcess] Closing Redis connection...');
      await closeRedisConnection();

      console.log('[AutomationWorkerProcess] Graceful shutdown completed. Goodbye!');
      process.exit(0);
    } catch (err) {
      console.error('[AutomationWorkerProcess] Error during shutdown:', err);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    console.error('[AutomationWorkerProcess] Unhandled promise rejection:', reason);
  });

  process.on('uncaughtException', (err) => {
    console.error('[AutomationWorkerProcess] Uncaught exception:', err);
    shutdown('UNCAUGHT_EXCEPTION');
  });
}

// Start worker process if run directly
if (require.main === module || !process.env.NODE_ENV?.includes('test')) {
  main().catch((err) => {
    console.error('[AutomationWorkerProcess] Startup failure:', err);
    process.exit(1);
  });
}
