import { Pool } from 'pg';

// dev HMR 시 풀이 중복 생성되지 않도록 globalThis 에 캐시.
declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined;
}

export const pool: Pool =
  globalThis.__pgPool ??
  new Pool({ connectionString: process.env.DATABASE_URL });

if (process.env.NODE_ENV !== 'production') {
  globalThis.__pgPool = pool;
}
