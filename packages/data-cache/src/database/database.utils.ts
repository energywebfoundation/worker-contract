import type { DataCacheConfiguration } from 'src/main';

export const getConnectionOptions = (config?: DataCacheConfiguration) => {
  const uri = config?.databaseUrl || process.env.DATABASE_URL;

  if (!uri) {
    throw new Error('DATABASE_URL environment variable not configured');
  }


  return {
    uri,
  };
};
