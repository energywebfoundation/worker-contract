export const getConnectionOptions = () => {
  const host = process.env.DB_HOST ?? 'localhost';
  const port = Number(process.env.DB_PORT ?? 5432);
  const username = process.env.DB_USERNAME ?? 'postgres';
  const password = process.env.DB_PASSWORD ?? 'postgres';
  const database = process.env.DB_DATABASE ?? 'origin';

  return {
    connectionUri:
      process.env.DATABASE_URL ??
      `postgres://${username}:${password}@${host}:${port}/${database}`,
  };
};
