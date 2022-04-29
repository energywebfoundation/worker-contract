export const getConnectionOptions = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable not configured');
  }

  return {
    uri: process.env.DATABASE_URL,
  };
};
