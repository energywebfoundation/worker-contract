const { join } = require('path');
const { config } = require('dotenv');

config({ path: join(__dirname, '..', '.env') });

exports.getConnectionOptions = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable not configured');
  }

  return {
    uri: process.env.DATABASE_URL,
  };
};