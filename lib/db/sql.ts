import { Pool, type QueryResult, type QueryResultRow } from 'pg';

type SqlTag = {
  <T extends QueryResultRow = QueryResultRow>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<QueryResult<T>>;
  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[],
  ): Promise<QueryResult<T>>;
};

function getConnectionString(): string {
  const url =
    process.env.POSTGRES_URL?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    process.env.POSTGRES_PRISMA_URL?.trim() ||
    '';
  if (!url) {
    throw new Error('POSTGRES_URL or DATABASE_URL is not set');
  }
  return url;
}

function isLocalConnection(url: string): boolean {
  return /localhost|127\.0\.0\.1/i.test(url);
}

const globalForPg = globalThis as unknown as { __wazzappPgPool?: Pool };

export function getPool(): Pool {
  if (!globalForPg.__wazzappPgPool) {
    const connectionString = getConnectionString();
    globalForPg.__wazzappPgPool = new Pool({
      connectionString,
      // Local Postgres does not use SSL; Neon/cloud often requires it.
      ssl: isLocalConnection(connectionString) ? false : undefined,
      max: 10,
    });
  }
  return globalForPg.__wazzappPgPool;
}

function buildQuery(strings: TemplateStringsArray, values: unknown[]) {
  let text = '';
  const params: unknown[] = [];
  for (let i = 0; i < strings.length; i++) {
    text += strings[i];
    if (i < values.length) {
      params.push(values[i]);
      text += `$${params.length}`;
    }
  }
  return { text, params };
}

async function sqlTag<T extends QueryResultRow = QueryResultRow>(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<QueryResult<T>> {
  const { text, params } = buildQuery(strings, values);
  return getPool().query<T>(text, params);
}

sqlTag.query = async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<QueryResult<T>> {
  return getPool().query<T>(text, params);
};

export const sql = sqlTag as SqlTag;
