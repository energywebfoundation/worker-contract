import { start } from 'data-cache';

start({
  databaseUrl: 'somedb://user:pass@db:5432/db',
  port: 3001,
});
