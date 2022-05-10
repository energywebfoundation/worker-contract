import type { DataCacheConfiguration } from '../main';

export default (config?: DataCacheConfiguration) => () => ({
  DATABASE_URL: config?.databaseUrl || process.env.DATABASE_URL,
  PORT: config?.port || process.env.PORT,
});
