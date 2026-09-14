import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';
import { sql, getPool } from './sql';

export const db = drizzle(getPool(), { schema });
export { sql, getPool };
export * from './schema';
